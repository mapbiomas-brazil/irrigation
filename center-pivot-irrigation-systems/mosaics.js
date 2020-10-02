// Collection Filter
function filterLandsatCollection(landsatCollectionPath, roi, startDate, endDate, cloudCover){
  var filteredCollection = ee.ImageCollection(landsatCollectionPath)
      .filterDate(startDate, endDate)
      .filterMetadata("CLOUD_COVER", "less_than", cloudCover)
      .filterBounds(roi);
  return filteredCollection;
}

// Padronize Landsat
var bandNames = ee.Dictionary({
  'LANDSAT_5': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'BQA'],
  'LANDSAT_7': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'BQA'],
  'LANDSAT_8': ['B2', 'B3','B4', 'B5', 'B6', 'B7', 'BQA']
});

function padronizeBandNames(image){
  var oldBandNames = bandNames.get(image.get('SPACECRAFT_ID'));
  var newBandNames = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'];
  return image.select(oldBandNames, newBandNames);
}

// Cloud Mask
var qaBits57 = ee.List([
  [0, 0, 0], //  Designated Fill
  [1, 1, 0], // Designated Pixel
  [4, 4, 0], // cloud-free
  [7, 8, 1]  // Cloud Shadow Confidence is Low
]);

var qaBits8 = ee.List([
  [0, 0, 0],
  [1, 1, 0],
  [4, 4, 0],
  [5, 6, 1],
  [7, 8, 1],
  [11, 12, 1]
]);

var qaBitsDict = ee.Dictionary({
  'LANDSAT_5': qaBits57,
  'LANDSAT_7': qaBits57,
  'LANDSAT_8': qaBits8
});

function getQABits(image, start, end) {
    var pattern = ee.Number(ee.List.sequence(start, end).distinct().iterate(function(i, pattern){
      i = ee.Number(i);
      pattern = ee.Number(pattern);

      return pattern.add(ee.Number(2).pow(i));
    }, ee.Number(0)));

    return image.select(0).bitwiseAnd(pattern.int()).rightShift(start);
}

function maskClouds(image){
  var qaBits = ee.List(qaBitsDict.get(image.getString('SPACECRAFT_ID')));
  var bqa = image.select('BQA');


  var inital_state = ee.Dictionary({
    'bqa': bqa,
    'mask': ee.Image(1)
  });

  var finalState = ee.Dictionary(qaBits.iterate(function(bits, state){
    bits = ee.List(bits);
    state = ee.Dictionary(state);

    var bqa = ee.Image(state.get('bqa'));
    var mask = ee.Image(state.get('mask'));

    var start = bits.getNumber(0);
    var end = bits.getNumber(1);
    var desired = bits.getNumber(2);

    var blueprint = getQABits(bqa, start, end).eq(desired);

    return ee.Dictionary({
        'bqa': bqa,
        'mask': mask.updateMask(blueprint)
    });

  }, inital_state));

  var cloudMask = ee.Image(finalState.get('mask'));

  return image.updateMask(cloudMask);
}

// GUI

var startDate = ui.Textbox('yyyy-mm-dd', '2019-01-01');
var endDate = ui.Textbox('yyyy-mm-dd', '2019-12-31');
var cloudCover = ui.Slider(0, 100, 80);
var windowSize = ui.Slider(30000, 100000, 30000);

var panel = ui.Panel({
  widgets: [
    ui.Label("Instructions:"),
    ui.Panel({
      widgets: [ui.Label("Start date:"), startDate],
      layout: ui.Panel.Layout.flow('horizontal'),
    }),
    ui.Panel({
      widgets: [ui.Label("End date:"), endDate],
      layout: ui.Panel.Layout.flow('horizontal'),
    }),
    ui.Panel({
      widgets: [ui.Label("Cloud Cover:"), cloudCover],
      layout: ui.Panel.Layout.flow('horizontal'),
    }),
    ui.Panel({
      widgets: [ui.Label("Window size (meters):"), windowSize],
      layout: ui.Panel.Layout.flow('horizontal'),
    }),
  ],
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    'position': 'top-left',
    'width': '300px'
  }
});

Map.add(panel);


// Main

var downloadImagePanel = ui.Panel({
  widgets: [
    ui.Label('To generate a mosaic for the center pivot irrigation mapping, change'),
    ui.Label('the parameters in the upper left panel and click anywhere on the map.')
  ]
});
Map.add(downloadImagePanel);

Map.onClick(function(coordinates){
  Map.layers().reset();
  var startDateValue = startDate.getValue();
  var endDateValue = endDate.getValue();
  var cloudCoverValue = cloudCover.getValue();
  var windowSizeValue = windowSize.getValue();

  var roi = ee.Geometry.Point([coordinates.lon, coordinates.lat]).buffer(windowSizeValue/2).bounds();

  Map.addLayer(ee.FeatureCollection([ee.Feature(roi)]).style({'color': 'red', 'fillColor': '00000000'}), {}, "ROI");

  var l5Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LT05/C01/T1_TOA", roi, "2000-01-01", "2011-10-01", cloudCoverValue));
  var l7Collection1 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C01/T1_TOA", roi, "2000-01-01", "2003-05-31", cloudCoverValue));
  var l7Collection2 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C01/T1_TOA", roi, "2011-10-01", "2013-03-01", cloudCoverValue));
  var l8Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LC08/C01/T1_TOA", roi, "2013-03-01", "2020-01-01", cloudCoverValue));

  var collection = l8Collection.merge(l5Collection).merge(l7Collection1).merge(l7Collection2)
    .filterDate(startDateValue, endDateValue)
    .map(padronizeBandNames)
    .map(maskClouds)
    .map(function(image){
      var ndvi = image.normalizedDifference(['NIR', 'RED']).rename("NDVI");
      return ndvi;
    });

  var mosaic = collection.reduce(ee.Reducer.percentile([75, 100]).combine(ee.Reducer.stdDev(), null, true));

  var mosaicStdDevStats = mosaic.select("NDVI_stdDev").reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: roi,
    scale: 30,
    maxPixels: 1E13
  });

  var mosaicStdDevMin = ee.Number.parse(mosaicStdDevStats.get("NDVI_stdDev_min"));
  var mosaicStdDevMax = ee.Number.parse(mosaicStdDevStats.get("NDVI_stdDev_max"));

  var normalizedMosaicStdDev = mosaic
    .select("NDVI_stdDev")
    .subtract(mosaicStdDevMin)
    .divide(mosaicStdDevMax.subtract(mosaicStdDevMin));

  mosaic = mosaic.addBands(normalizedMosaicStdDev, null, true);

  var filename = startDateValue + "_" + endDateValue + "_" + new Date().getTime() + "_mosaic";

  var mask = ee.Image(1).clip(roi);

  Map.addLayer(mosaic.updateMask(mask), {bands: ["NDVI_p75", "NDVI_p100", "NDVI_stdDev"], min: 0.29, max: 0.88}, filename);

  var finalMosaic = mosaic
    .select("NDVI_p75", "NDVI_p100","NDVI_stdDev")
    .multiply(255)
    .byte();

  if(downloadImagePanel !== null){
    Map.remove(downloadImagePanel);
  }

  downloadImagePanel = ui.Panel({
    widgets: [
      ui.Label('Do you want to download this image? Click'),
      ui.Button('here', function(){
        Map.remove(downloadImagePanel);
        downloadImagePanel = null;

        downloadImagePanel = ui.Panel({
          widgets: [
            ui.Label('Go to "Tasks" in the upper right panel and click "run".'),
            ui.Label('After the task is complete, enter your Google Drive and search for a directory with the name MAPBIOMAS-PRIVATE')
          ]
        });
        Map.add(downloadImagePanel);

        Export.image.toDrive({
          image: finalMosaic,
          description: filename,
          folder: 'MAPBIOMAS-PRIVATE',
          fileNamePrefix: filename,
          region: roi,
          crs: 'EPSG:3857',
          maxPixels: 1E13,
          scale: 30
        });
      })
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });

  Map.add(downloadImagePanel);
});

Map.setOptions('satellite');
