/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-48.97814112638184, -16.189998079801914],
          [-48.97814112638184, -16.500995011948245],
          [-48.67327052091309, -16.500995011948245],
          [-48.67327052091309, -16.189998079801914]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/**
 * @name
 *      EXPORT TRAINING SAMPLES     
 * 
 * @description
 *      Script to export mosaic and labels to be used in the RCNN training. 
 *  
 * @author
 *      Agrosatélite
 *      mapbiomas@agrosatelite.com.br
 *
 * @version
 *      MapBiomas Collection 7.0 (beta)
 * 
 *  
 */

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//            FUNCTIONS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function filterLandsatCollection(landsatCollectionPath, roi, startDate, endDate, cloudCover){
  var filteredCollection = ee.ImageCollection(landsatCollectionPath)
      .filterDate(startDate, endDate)
      .filterMetadata("CLOUD_COVER", "less_than", cloudCover)
      .filterBounds(roi);
  return filteredCollection;
}



// Padronize Landsat
var bandNames = ee.Dictionary({
  'LANDSAT_5': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'QA_PIXEL'],
  'LANDSAT_7': ['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'QA_PIXEL'],
  'LANDSAT_8': ['B2', 'B3','B4', 'B5', 'B6', 'B7', 'QA_PIXEL']
});

function padronizeBandNames(image){
  var oldBandNames = bandNames.get(image.get('SPACECRAFT_ID'));
  var newBandNames = ['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1', 'SWIR2', 'BQA'];
  return image.select(oldBandNames, newBandNames);
}

// Cloud Mask

function maskClouds(image){
  var qa = image.select('BQA')
  var mask = qa.bitwiseAnd(1 << 3).and(qa.bitwiseAnd(1 << 8).or(qa.bitwiseAnd(1 << 9))) // Cloud with any confidence level
            .or(qa.bitwiseAnd(1 << 1)) // Dilated cloud  
            .or(qa.bitwiseAnd(1 << 4).and(qa.bitwiseAnd(1 << 10).or(qa.bitwiseAnd(1 << 11)))) // Cloud shadow
            .or(qa.bitwiseAnd(1 << 5)) // Snow  
            .or(qa.bitwiseAnd(1 << 7)) // Water  
            .or(qa.bitwiseAnd(1 << 14).and(qa.bitwiseAnd(1 << 15))) // Cirrus (high confidence)
  
  return image.updateMask(mask.not())
}


function get_RGB_id (feat){
    var codigo = ee.String(feat.get('RGB_COMPOS'))
    var split = codigo.split('')
    
    var red = ee.String(feat.get('RGB_COMPOS')).split('').slice(0, 2).join('')
    var green = (ee.String(feat.get('RGB_COMPOS')).split('').slice(2, 4).join(''))
    var blue = (ee.String(feat.get('RGB_COMPOS')).split('').slice(4, 5).join(''))
    

    return feat.set('red', ee.Number.parse(red)).set('green', ee.Number.parse(green)).set('blue', ee.Number.parse(blue)).set('rgb', red.cat('_').cat(green).cat('_').cat(blue))
    

}

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//            CREATE GRIDS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
var tiles_area = ee.FeatureCollection('users/agrosatelite_mapbiomas/COLECAO_7/GRIDS/TILES_PIVOT_RCNN').filter(ee.Filter.gte('n_pivot', 5))


var lim = 10

var train = tiles_area.filter(ee.Filter.gte('n_pivot', lim)).filterBounds(geometry)
var test = tiles_area.filter(ee.Filter.and(ee.Filter.lte('n_pivot', lim),ee.Filter.gte('n_pivot', lim - (lim/3)))) 

  
//Map.addLayer(train_grid, {color: 'black'}, 'Train Grid');


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//            SETTINGS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var cloudCoverValue = 80
var startDateValue = '2019-01-01'
var endDateValue = '2019-12-31'


var pivot = ee.FeatureCollection('users/your_username/MAPBIOMAS/C7/REFERENCE_MAPS/IRRIGATION/PIVOT')


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//           MOSAIC
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Map.addLayer(pivot)

train.evaluate(function(feat){

  feat.features.forEach(function(feature){

  var id = parseInt("0x" + feature.id); 
  var roi = ee.Geometry(feature.geometry)
  

  var l5Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LT05/C02/T1_TOA", roi, "2000-01-01", "2011-10-01", cloudCoverValue));
  var l7Collection1 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C02/T1_TOA", roi, "2000-01-01", "2003-05-31", cloudCoverValue));
  var l7Collection2 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C02/T1_TOA", roi, "2011-10-01", "2013-03-01", cloudCoverValue));
  var l8Collection = ee.ImageCollection(filterLandsatCollection("LANDSAT/LC08/C02/T1_TOA", roi, "2013-03-01", "2020-01-01", cloudCoverValue));

      
      var collection = l8Collection.merge(l5Collection).merge(l7Collection1).merge(l7Collection2)
        .filterDate(startDateValue,endDateValue)
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
      
      
      var mask = ee.Image(1).clip(roi);
      
      
      var finalMosaic = mosaic
            .select(["NDVI_p75", "NDVI_p100","NDVI_stdDev"], ['r', 'g', 'b'])
            .multiply(255)
            .byte();
            
      
        Map.addLayer(finalMosaic.updateMask(mask), {min: 0, max: 255}, 'MOSAIC');


         var label = pivot.filterBounds(roi).map(get_RGB_id)
         
        // Map.addLayer(label)
         

         var pivo_img_blue = ee.Image().paint({featureCollection: label,color: 'blue'})
         var pivo_img_green = ee.Image().paint({featureCollection: label, color: 'green'})
         var pivo_img_red = ee.Image().paint({featureCollection: label,color: 'red'})


         var result = pivo_img_red.addBands(pivo_img_green).addBands(pivo_img_blue).rename(['r', 'g', 'b'])
         Map.addLayer(result.randomVisualizer(), {}, 'MASK')
         
         
          //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
          //            EXPORTS
          //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
         
          // Export table with rgb information
            Export.table.toDrive({
                collection: label, 
                description: id +  "_mosaic", 
                folder: "annotations_train", 
                fileFormat: 'CSV'})
      
      
            // export mosaic 
              Export.image.toDrive({
                image: finalMosaic,
                description:  id + "_mosaic",
                folder: "images_train",
                crs: 'EPSG:3857',
                region: roi,
                maxPixels: 1E13,
                scale: 30
              })
              
      
              // export label
              Export.image.toDrive({
                image: result.unmask().byte(), 
                description:  id +'_labels' , 
                folder: "masks_test", 
                crs: 'EPSG:3857', 
                region: roi, 
                scale: 30,
                maxPixels: 10e10, 
                fileFormat: 'GEOTIFF'
                });
                
     
              
      })
            
})
          