// set the path to the api.js script you copied to your GEE account:
var api = require('users/your_username/repository_name:utils/api.js');

// set the path to the normalization.js script you copied to your GEE account:
var normalization = require("users/your_username/repository_name:utils/normalization.js");

// ****************** SETTINGS ********************

// set the year you want to classify:
var year = 2019;
var startDate = "" + year + "-01-01";
var endDate = "" + (year + 1) + "-01-01";
var cloudCover = 90;

// set the output path for the classification results:
var outputAsset = 'users/your_username/MABIOMAS/C6/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/RESULTS/RAW';

// Region of interest
var brazilianMunicipalitiesPath = "users/mapbiomas1/PUBLIC/GRIDS/SEMIARID";
var geoCodeField = 'CD_GEOCMU';
var irrigatedAreaDefaultField = 'at15_total';

// ****************** END SETTINGS ********************


// ****************** ANCILLARY DATA ********************

var elevation = ee.Image('USGS/SRTMGL1_003');
var climateCollection = ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE");

// ****************** SAMPLES DATA ********************

// set path to the previously collected samples:
var samplesAssetDir = 'users/your_username/MAPBIOMAS/C9/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/SAMPLES';

var fullTrainingSamples = ee.FeatureCollection([]);
ee.data.listAssets(samplesAsset)
  .assets
  .forEach(function (samplePath) {
    var s = ee.FeatureCollection(samplePath.id);
    fullTrainingSamples = fullTrainingSamples.merge(s);
  });

// ****************** END ANCILLARY DATA ********************

// ****************** GRIDS ********************

var municipiosExtra = ee.List(['2926004', '2930204', '2930204', '2608750', '2609808', '2603009', '2601607', '2607406', '2605707', '2611002', '2614808', '2608057', '2900207', '2907707', '2927101', '2911402', '2924009']);

var municipios = ee.FeatureCollection(brazilianMunicipalitiesPath)
  .filter(ee.Filter.or(ee.Filter.greaterThan(irrigatedAreaDefaultField, 5000), ee.Filter.inList(geoCodeField, municipiosExtra)));

Map.addLayer(municipios.style({ color: '#ff0000', fillColor: '#ffffff00' }), {}, "municipios");

Map.addLayer(fullTrainingSamples, {}, "Samples", false);

// ****************** END GRIDS ********************

var clicked = false;

Map.onClick(function (coordinates) {
  var point = ee.Geometry.Point([coordinates.lon, coordinates.lat]);
  var feature = ee.Feature(municipios.filterBounds(point).first());

  var loaded = false;
  feature.evaluate(function (data) {
    if (loaded === false) {
      loaded = true;
    } else {
      return;
    };

    print("Data:", data);

    var geoCode = data.properties[geoCodeField];
    var roi = feature.geometry();

    var trainingSamples = fullTrainingSamples.filterBounds(roi);
    Map.addLayer(trainingSamples, {}, "trainingSamples", false);

    var landsatCollection = ee.ImageCollection(normalization.get16DayproductByROI(roi, startDate, endDate, cloudCover,
      ["GREEN", "RED", "NIR", "SWIR1", "SWIR2", "TIR1"]))
      .map(function (image) {
        return image.updateMask(image.select("QF").eq(1));
      });

    var mosaic = new api.ImageCollection(landsatCollection)
      .buildBands([api.Band.RED, api.Band.NIR, api.Band.SWIR1, api.Band.TIR1, api.Band.EVI2, api.Band.NDWI, api.Band.CAI])
      .applyReducers([api.Reducer.QMO(api.Band.EVI2), api.Reducer.MIN, api.Reducer.MEDIAN, api.Reducer.STDV])
      .getEEImage()

    var slope = ee.Algorithms.Terrain(elevation).select("slope");

    var terraClimate = climateCollection.filterDate(startDate, endDate)
      .select('pr', 'aet', 'def')
      .sum();

    var annualEvapotranspiration = terraClimate.select('aet').multiply(0.1);
    var annualPrecipitation = terraClimate.select('pr');
    var annualHydricDeficit = terraClimate.select('def').multiply(0.1);

    mosaic = mosaic
      .addBands(slope)
      .addBands(annualPrecipitation)
      .addBands(annualEvapotranspiration)
      .addBands(annualHydricDeficit)
      .unmask(null);

    Map.addLayer(mosaic, { bands: ["NIR_qmo", "SWIR1_qmo", "RED_qmo"], min: 0, max: 5000 }, "Mosaic", false);


    print("Class  0:", trainingSamples.filterMetadata("class", "equals", 0).size());
    print("Class  1:", trainingSamples.filterMetadata("class", "equals", 1).size());
    print("Class  2:", trainingSamples.filterMetadata("class", "equals", 2).size());

    var classfier = ee.Classifier
      .smileRandomForest(100)
      .train({
        features: trainingSamples,
        classProperty: 'class',
        inputProperties: mosaic.bandNames()
      })

    var classified = mosaic.classify(classfier)
      .set('year', year);

    var filename = 'irrigated_crops_' + geoCode + '_' + year;
    Map.addLayer(classified.selfMask(), { min: 0, max: 2, palette: ['black', 'red', 'blue'] }, filename, false);

    Export.image.toAsset({
      image: classified.selfMask().byte(),
      description: filename,
      assetId: outputAsset,
      maxPixels: 1E13,
      scale: 30,
      region: roi
    });
  })
});
