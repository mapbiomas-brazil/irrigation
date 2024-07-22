/**
 * @name
 *      SPATIAL AND DILATION FILTER 
 * 
 * @description
 *      This script input must be the result of the erosion filter.
 *      The spatial filter is used to unify pivots that are splitted by
 *      tile borders. It iterates over each tile bordering tiles and apply
 *      a reducer by the connected pixels. Tha dilation filter is applied
 *      after to return the pivot to its original shape before the application
 *      of the erosion filter.
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
 

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//    IMPORTS AND INPUTS 
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// You can change this for another brazilian UF or use another geometry to filter the grid
var uf = ee.FeatureCollection('users/agrosatelite_mapbiomas/REGIONS/ibge_estados_2019').filter(ee.Filter.eq('SIGLA_UF', 'MG'))

// Special grid contatining bordering tiles info
var grid = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_7/GRIDS/TILES_PIVOT_RCNN_BORDERING").filterBounds(uf)
              .map(function(tile){
                return ee.Feature(tile
                          .set('bordering', ee.List(tile.getString('bordering').decodeJSON()),
                               'id', ee.Number(tile.get('id'))
                          )
                        )
              })

//Map.addLayer(grid, {}, 'GRID', false)

// CHOOSE THE YEARS TO APPLY THE FILTER
var years = [2015,2016,2017,2018,2019,2020,2021]

// Set the output destination to an imageCollection
var output = 'users/your_username/MAPBIOMAS/C9/IRRIGATION/PIVOT/RESULT_MASKRCNN/DILATION_FILTER/'

// Set the individual filename
var filename = 'EROSION_FILTER_IMG'


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//    FILTER CONFIGURATIONS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var radiusKernel = 100;
var erosionKernel = ee.Kernel.circle({radius: radiusKernel, units: 'meters'});




//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//      APPLY FILTERS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

years.forEach(function(year){
  
  // Set the path for the result of the erosion filter
  var raw_erosion = ee.Image('users/your_username/C7/IRRIGATION/PIVOT/RESULT_MASKRCNN/EROSION_FILTER/EROSION_FILTER_IMG_'+year)
  
  // Add the bordering properties to the images/bands
  var tilesCollections_exp = ee.ImageCollection(
    raw_erosion.bandNames().map(function(band){
      
      var band_name = ee.Number.parse(ee.String(band).slice(-5))
      var tiles_bordering = grid.filter(ee.Filter.eq('id', band_name)).first().get('bordering')
      
      return raw_erosion.select(ee.String(band))
                        .rename('b1')
                        .set('band_name', band_name,
                             'bordering', tiles_bordering
                             )
  
    })
  )
  
  
  
  // Spatial filter
  var tilesReduced = tilesCollections_exp.map(function (tile1) {
          
          
          var tiles_filter = tilesCollections_exp.filter(ee.Filter.inList('band_name', tile1.get('bordering')))
          
          var tilesReduced = tiles_filter.map(function (tile2) {
  
                  var tilesToReduce = tile2.addBands(tile1);
  
                  var reduced = tilesToReduce.reduceConnectedComponents(
                      {
                          'reducer': ee.Reducer.max(),
                      });
  
                  return reduced;
              });
  
          return tilesReduced;
      }
  );
  print(tilesReduced.flatten().size())
  
  // Unify the images
  tilesReduced = ee.ImageCollection(tilesReduced.flatten()).reduce(ee.Reducer.max());
  
  // Apply dilation filter
  var openedImage = tilesReduced.focal_max({kernel: erosionKernel, iterations: 2})
  
  Map.addLayer(openedImage.selfMask().randomVisualizer(), {}, 'result')  
    
  
  
  
  //>>>>>>>>>>>>>>>>>
  //     EXPORT
  //>>>>>>>>>>>>>>>>>

  Export.image.toAsset({
      image: openedImage.unmask().set('step', 'final', 'year', year),
      description: filename +'_'+year,
      assetId: output  + filename +'_'+year,
      region: grid.geometry().bounds(),
      scale: 30,
      maxPixels: 1e13
  });

})
  