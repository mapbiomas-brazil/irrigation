/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = 
    /* color: #98ff00 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-54.08364058086728, -13.560166104591794],
          [-54.08364058086728, -23.905554855407882],
          [-38.37319136211728, -23.905554855407882],
          [-38.37319136211728, -13.560166104591794]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/**
 * @name
 *      SPATIAL TEMPORAL FILTER
 * 
 * @description
 *      Apply a temporal filter to keep IDs constant through the series.
 *      A spatial filter is also applied to remove pivots with less than
 *      10ha of area. 
 *  
 * @author
 *      Agrosatélite
 *      mapbiomas@agrosatelite.com.br
 *
 * @version
 *      MapBiomas Collection 7.0 (beta)
 * 
 */


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//          IMPORTS AND INPUTS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// You can change this for another brazilian UF or use another geometry to filter the grid
var uf = ee.FeatureCollection('users/agrosatelite_mapbiomas/REGIONS/ibge_estados_2019').filter(ee.Filter.eq('SIGLA_UF', 'MG'))

var grid = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_7/GRIDS/TILES_PIVOT_RCNN").filterBounds(uf)

Map.addLayer(grid, {}, 'GRID', false)


// Set the path for the imageCollection output of the dilation filter
var col = ee.ImageCollection('users/your_username/MAPBIOMAS/C7/IRRIGATION/PIVOT/RESULT_MASKRCNN/DILATION_FILTER/')

// Set the years to filter
var years = [2015,2016,2017,2018,2019,2020,2021]

// Set output collection name
var output = 'users/your_username/MAPBIOMAS/C7/IRRIGATION/PIVOT/RESULT_MASKRCNN/FINAL_FILTER/'

// Set the filename for each image
var filename = 'final_filtered'



//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//                FILTERS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Sum based on the final series year
var acumulado_2021 = col.sum().select("b1_1_max") 

years.forEach(function(year){


  var acumulado_ano = col.filter(ee.Filter.lte("year", year)).sum().select("b1_1_max") 
  
  
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //        ID TRANSFER FILTER
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  
  var tile1_2021 = acumulado_2021.unmask(0, false).select("b1_1_max").rename('ref')
  var tile1_2_ano = tile1_2021.addBands(acumulado_ano.unmask(0, false)).unmask(0, false)
  

  var reduceConn = tile1_2_ano.reduceConnectedComponents({
                    reducer: ee.Reducer.mode(), 
                    labelBand:'b1_1_max', 
                    // maxSize: 
                    })
  
  
  
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //            AREA FILTER
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  
  var pivot_vector = reduceConn.selfMask().reduceToVectors({ //Image for vectors
                        reducer: ee.Reducer.countEvery(),
                        scale: 30,
                        maxPixels: 1e13,
                        geometry: uf
                        }) 
                        
    
  var area = pivot_vector.map(function(pivot){
    pivot = ee.Feature(pivot)
    return pivot.set('area', pivot.area(30))
  })
  
  var filter_pivot = area.filter(ee.Filter.gt('area', 100000)) //area of less than 10 acres are removed (noise)
  
  var filter_pivot = filter_pivot.filterBounds(uf)
  
  
  print(filter_pivot.size(), 'filter_pivot_area_10000h')
  
  
  
  //>>>>>>>>>>>>>>>>>>>>>>>
  //        EXPORT
  //>>>>>>>>>>>>>>>>>>>>>>>
  
  Export.table.toAsset({
    collection: filter_pivot, 
    description: filename+'_'+year  , 
    assetId: output + filename +'_'+year  
    })
  
})

