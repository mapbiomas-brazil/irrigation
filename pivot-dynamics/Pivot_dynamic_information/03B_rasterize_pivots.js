/**
 * @name
 *      RASTERIZE PIVOTS
 * 
 * @description
 *      This simple script is used to rasterize individualized pivots, maintaining each property of the 
 *      vector as a band. The export is the final product for the individualized pivots.
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

// Geomtry for export (can be changed)
var geometry = ee.Geometry.Polygon(
        [[[-51.39224141772448, -13.526996959143428],
          [-51.39224141772448, -23.612893815757097],
          [-39.37319844897448, -23.612893815757097],
          [-39.37319844897448, -13.526996959143428]]], null, false);  

// Set target years
var year = [2015,2016,2017,2018,2019,2020,2021]


// Set you imageCollection destination
var output_destination = 'users/your_username/MAPBIOMAS/C7/IRRIGATION/PIVOT/RESULT_MASKRCNN/RESULTS_PIVOTS/'
var output_name = 'pivot_classif'



year.forEach(function(year){
  
  var pivot = ee.FeatureCollection('users/your_username/MAPBIOMAS/C7/IRRIGATION/PIVOT/RESULT_MASKRCNN/RESULTS_VECTOR_PIVOTS/pivot_vector_classif_'+year)
  
  pivot = pivot.select(['id','pivot_class','n_peaks',
                                 'start_cycle_1', 'end_cycle_1',
                                 'start_cycle_2', 'end_cycle_2',
                                 'start_cycle_3', 'end_cycle_3',
                                 'days_cycle_1','days_cycle_2','days_cycle_3',
                                 'precipitation_cycle_1','precipitation_cycle_2','precipitation_cycle_3'
                                 ])
                                 
  var img_pivot = pivot.first().propertyNames().remove('system:index').map(function(property){
      return pivot.reduceToImage([property], ee.Reducer.first()).rename([property])
    })
    img_pivot = ee.ImageCollection(img_pivot).toBands()
                   .rename(pivot.first().propertyNames().remove('system:index'))
                   .set('year', year)
  
   img_pivot = img_pivot.select(['id','pivot_class','n_peaks',
                                 'start_cycle_1', 'end_cycle_1',
                                 'start_cycle_2', 'end_cycle_2',
                                 'start_cycle_3', 'end_cycle_3',
                                 'days_cycle_1','days_cycle_2','days_cycle_3',
                                 'precipitation_cycle_1','precipitation_cycle_2','precipitation_cycle_3'
                                 ],
                                ['b1_id','b2_class','b3_n_cycles',
                                 'b4_start_cycle_1', 'b5_end_cycle_1',
                                 'b6_start_cycle_2', 'b7_end_cycle_2',
                                 'b8_start_cycle_3', 'b9_end_cycle_3',
                                 'b10_days_cycle_1','b11_days_cycle_2','b12_days_cycle_3',
                                 'b13_precipitation_cycle_1','b14_precipitation_cycle_2','b15_precipitation_cycle_3'
                                 ])
  
  Map.addLayer(img_pivot.select('b3_n_cycles').randomVisualizer(), {}, 'Pivot Image '+ year )
  Map.addLayer(pivot, {}, 'Pivot Vector '+ year )
  

  Export.image.toAsset({
                image: img_pivot,
                description: output_name +'_'+ year ,
                assetId: output_destination + output_name +'_'+ year,
                region: geometry,
                scale: 30,
                maxPixels: 1e13
              })


})

Map.addLayer(geometry)



