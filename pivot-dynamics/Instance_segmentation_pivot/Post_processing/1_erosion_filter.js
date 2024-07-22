/**
 * @name
 *      EROSION FILTER 
 * 
 * @description
 *      Script used to import the classified pivots from the RCNN and run
 *      an erosion filter. The result is used in the next filter script.
 * 
 * @author
 *      Remap
 *      mapbiomas@remapgeo.com
 *
 * @version
 *      MapBiomas Collection 9.0 (beta)
 * 
 *  
 */
 


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//          IMPORT GRIDS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// You can change this for another brazilian UF or use another geometry to filter the grid
var uf = ee.FeatureCollection('users/agrosatelite_mapbiomas/REGIONS/ibge_estados_2019').filter(ee.Filter.eq('SIGLA_UF', 'MG'))

var grid = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_7/GRIDS/TILES_PIVOT_RCNN").filterBounds(uf)

Map.addLayer(grid, {}, 'GRID', false)



//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//      FILTER CONFIGURATIONS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  
var radiusKernel = 100;
var erosionKernel = ee.Kernel.circle({radius: radiusKernel, units: 'meters'});
  
  

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//  IMPORT CLASSIFIED RCNN OUTPUT
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//CHOOSE THE YEARS TO APPLY THE FILTER AND THE OUTPUT DESTINATION
var years = [2015,2016,2017,2018,2019,2020,2021]

years.forEach(function(year){
  // Set the path to an imageCollection
  var output = 'users/your_username/MAPBIOMAS/C9/IRRIGATION/PIVOT/RESULT_MASKRCNN/EROSION_FILTER/'
  // Set the name of each image in the collection
  var filename = 'EROSION_FILTER_IMG_' +year  
  
  // Change this collection for your uploaded RCNN result
  var tilesCollections = ee.ImageCollection('users/youyr_username/MAPBIOMAS/C9/IRRIGATION/PIVOT/RESULT_MASKRCNN/UPLOAD/MOSAIC_'+year)
       
  
  Map.addLayer(tilesCollections.max().selfMask().randomVisualizer(), {opacity: 0.5}, 'IMAGECOLLECTION RAW', false) 
  
  

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //      APPLY FILTER 
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>
    
  var tilesCollections_exp = tilesCollections.map(function(img){
    
    var erosion_img = img.focal_min({kernel: erosionKernel, iterations: 2}).unmask(0, false)
    
    return erosion_img;
    })
  
  Map.addLayer(tilesCollections_exp.max().selfMask(), {}, 'erosion collection', false) 
  
  

  // Tranforms imageCollection into an image
  var raw_erosion = tilesCollections_exp.toBands()
  
  var new_names= raw_erosion.bandNames().map(function(band){
  
    return ee.String('b1_').cat(ee.String(band).split('_').get(0))
  })
  
  raw_erosion = raw_erosion.rename(new_names)
  

  
  //>>>>>>>>>>>>>>>>>>>>>>
  //       EXPORT
  //>>>>>>>>>>>>>>>>>>>>>>
  
  Export.image.toAsset({
      image: raw_erosion.unmask().set('step', 'erosion'),
      description: filename,
      assetId: output + filename,
      // pyramidingPolicy: { '.default': 'mode' },
      region: grid.geometry().bounds(),
      scale: 30,
      maxPixels: 1e13
  });
  })




  