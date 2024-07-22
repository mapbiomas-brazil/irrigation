/**
 * @name
 *      PIVOT INFORMATION (PEAKS, DATES, PRECIPITATION)
 * 
 * @description
 *      This script calculates the number of cycles each center irrigation pivot in a FeatureCollection
 *      has, and it does so  by identifying the valleys in a harmonized time series. Valleys dates are 
 *      set for a given pivot if there is an agreement of its pixels. The agreement percentage is set by
 *      the inverse of the percentiles, which are given as a list and tested to find the minimum amount
 *      of error among them. Errors are believed to be caused by intra-pivot dynamics that we can not at
 *      this time identify, and are not used in further calculations, but are kept and identified as 
 *      errors in the final output. 
 *
 *      The output is a FeatureCollection of pivots, containing properties of:
 *      - id : unique identification of the pivot
 *      - n_peaks : number of peaks (or cycles) in a given crop year
 *      - class: class identifier
 *                - 0 = not-calssified
 *                - 1 = temporary crops
 *                - 2 = perrenial crops
 *                - 3 = sugarcane
 *      - start_cycle_1 : date of the start of the first cycle (YYYYMMdd) (repeated for cycles 1 to 3)
 *      - end_cycle_1 : date of the end of the first cycle (YYYYMMdd)     (repeated for cycles 1 to 3)
 *      - precipitation_cycle_1 : accumulated precipitation in cycle 1    (repeated for cycles 1 to 3)
 *      - days_cycle_1 : days in cycle 1                                  (repeated for cycles 1 to 3)    
 *  
 * @author
 *      Remap
 *      mapbiomas@remapgeo.com
 *
 * @version
 *      MapBiomas Collection 9.0 (beta)
 * 
 */



//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//                                             IMPORTS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/**/

  
// packages
var whittaker = require('users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection7/utils/whittaker_smoother')
var peak_valley_detection = require('users/agrosatelite_mapbiomas/mapbiomas_tutorial:collection7/utils/peak_valley_detection')

// precipitation data
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY");


/**/

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//                                             INPUTS
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/**/


// You can change this for another brazilian UF or use another geometry to filter the grid
var uf = ee.FeatureCollection('users/agrosatelite_mapbiomas/REGIONS/ibge_estados_2019').filter(ee.Filter.eq('SIGLA_UF', 'MG'))

                      
   var  grid = ee.FeatureCollection("users/agrosatelite_mapbiomas/COLECAO_6/GRIDS/BRASIL_COMPLETO")
                   .filterBounds(uf);
    Map.addLayer(grid,{},'', false)
    Map.addLayer(uf,{},'', false )
   var list_ops = grid.aggregate_array('PATHROW')
   //print (list_ops)
  



// select target years
var years = [2015, 2016, 2017, 2018, 2019, 2020, 2021]


// select targets path/row (op)
var op = [ //MG LANDSAT SCENES
  [219,71],
	[219,72],
	[219,73],
	[220,71],
  [220,72],
	[220,73],
  [221,71],
  [223,73],
  [223,74],
  [216,71],
  [217,70],
  [217,71],
  [219,70],
  [219,71],
  [220,70],
  [221,70],
  [218,70],
  [218,71],
  [216,75],
  [217,72],
  [217,73],
  [217,74],
  [217,75],
  [218,76],
  [219,72],
  [219,73],
  [219,74],
  [219,75],
  [219,76],
  [222,73],
  [222,74],
  [220,71],
  [220,72],
  [220,73],
  [220,74],
  [220,75],
  [221,71],
  [221,72],
  [221,73],
  [221,74],
  [218,72],
  [218,73],
  [218,74],
  [218,75],
  [216,72],
  [216,73],
  [216,74]
  ]

// define the percentile for the reduction to test (inverse of the percentual majority wanted for a date to be considered a valley)
var percentiles = [50,51,52,53,54,55,56,57,58,59,60]


// define output destination (folder)
var outputCollection = 'users/your_username/MAPBIOMAS/C9/IRRIGATION/PIVOT/RESULT_MASKRCNN/RESULTS_VECTOR_PIVOTS/';                      

// set filename for export
var filename = 'pivot_vector_classif'




/**/

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//                               FUNCTIONS AND COLLECTION PRE-PROCESSING
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/**/

// Padronize and Import Landsat Collections
function filterLandsatCollection(landsatCollectionPath, startDate, endDate){
  var filteredCollection = ee.ImageCollection(landsatCollectionPath)
      .filterDate(startDate, endDate)

  return filteredCollection;
}

// Landsat Collection 2 band names
var bandNames = ee.Dictionary({
  'LANDSAT_5': ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7', 'ST_B6','QA_PIXEL'],
  'LANDSAT_7': ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7', 'ST_B6','QA_PIXEL'],
  'LANDSAT_8': ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7','ST_B10','QA_PIXEL']
});

// Padronized band names
var PadronizedBandNames = ee.Dictionary({
  'LANDSAT_5': ['B','GR','R','NIR','SWIR_1','SWIR_2', 'TIR', 'pixel_qa'],
  'LANDSAT_7': ['B','GR','R','NIR','SWIR_1','SWIR_2', 'TIR', 'pixel_qa'],
  'LANDSAT_8': ['B','GR','R','NIR','SWIR_1','SWIR_2', 'TIR', 'pixel_qa']
})

// Function to padronize band names based on satellite
function padronizeBandNames(image){
  var oldBandNames = bandNames.get(image.get('SPACECRAFT_ID'))
  var newBandNames = PadronizedBandNames.get(image.get('SPACECRAFT_ID'))
  return image.select(oldBandNames, newBandNames)
          
}

// Function to aplly data correction in the Landsat bands; based on parameters provided by the collection itself
function correctionSR (image) {
  var new_img = image.select(PadronizedBandNames.get(image.get('SPACECRAFT_ID')))
                      .multiply([0.0000275, 0.0000275, 0.0000275, 0.0000275,
                       0.0000275, 0.0000275, 0.00341802, 1])
                      .add([-0.2, -0.2, -0.2, -0.2, -0.2, -0.2, 149.0, 0])

  return image.addBands(new_img, null, true)
}



// Select satellite date range
var l5 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LT05/C02/T1_L2",  "2000-01-01", "2011-10-01"));
var l7 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C02/T1_L2",  "2000-01-01", "2003-05-31"));
var l7_2 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LE07/C02/T1_L2",  "2011-10-01", "2013-03-01"));
var l8 = ee.ImageCollection(filterLandsatCollection("LANDSAT/LC08/C02/T1_L2",  "2013-03-01", "2021-12-31"));
var full_col = l8.merge(l7).merge(l7_2).merge(l5)


/**/ 

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//                                         LOOP FOR YEARS AND OP
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/**/

years.forEach(function(year){
  
  var grids_peaks = ee.FeatureCollection([])

  
  op.forEach(function(tile){
    
     
    
    // Get the path and row
    var path = tile[0];
    var row = tile[1];   
    
    // get the landsat scene
    var roi = ee
      .FeatureCollection(
        "users/agrosatelite_mapbiomas/COLECAO_5/GRIDS/BRASIL_COMPLETO"
      )
      .filter(ee.Filter.eq("PATH", path))
      .filter(ee.Filter.eq("ROW", row))
      .first().geometry().buffer(-4200);
      
    
    var mask_roi = ee.Image(1).clip(roi)
    
    
    // import pivot collection 
    var pivot = ee.FeatureCollection('users/your_username/MAPBIOMAS/C9/IRRIGATION/PIVOT/RESULT_MASKRCNN/FINAL_FILTER/final_filtered_'+year)
                    .filterBounds(roi)
                    
    
    // pivot collection in raster format
    var img_pivot = ee.Image(1).clipToCollection(pivot)
    
    
    // peak vegetation raster for crop calendar definition
    var peak_veg_clip = ee.Image("projects/agrosatelite-mapbiomas/assets/COLECAO_7/peaks_MODIS_temporaryCrops")
                            .select("peak_"+year) 
                            .clip(roi);
    
    // peak vegetation month for the landsat scene and given year
    var wrsMonth = peak_veg_clip.reduceRegion({
      reducer: ee.Reducer.mode(),
      geometry: roi,
      scale: 250,
      maxPixels: 1e13
    });
    var month = ee.Number(wrsMonth.get("peak_"+year)).round().toInt();
    //print(ee.String("Peak Vegetation Month in ").cat(month));

    // set buffer range based on peak vegetation
    var bufferStartDate = ee.Date.fromYMD(year, month, 15).advance(-9, "month");
    var bufferEndDate = ee.Date.fromYMD(year, month, 15).advance(15, "month");
    
    
    
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //           Harmonization
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    
    
    // filtering the Landsat collection
    var collection = full_col
                        .filter(ee.Filter.and(
                          ee.Filter.eq('WRS_PATH', path), 
                          ee.Filter.eq('WRS_ROW', row), 
                          ee.Filter.date(bufferStartDate, bufferEndDate)
                          ))
                        .map(padronizeBandNames)
                        .map(correctionSR)
                        .map(function(image){
                          // EVI2 calculation
                          return image.addBands(image.expression('2.5 * ((NIR - RED) / (NIR + 2.4*RED + 1))', {
                            'NIR': image.select('NIR'),
                            'RED': image.select('R')
                          }).rename('EVI2')).unmask(0, false).updateMask(mask_roi)
                        })
                        .select(['EVI2'])
    
    
    // harmonization/smoothing using the Whittaker method
    var harmonizedCollection = whittaker.whittakerSmoothing(collection, null, 10)[0]
    
    // set real range based on peak vegetation
    var startDate = ee.Date.fromYMD(year, month, 15).advance(-3, "month");
    var endDate = ee.Date.fromYMD(year, month, 15).advance(9, "month");
    harmonizedCollection = harmonizedCollection.filterDate(startDate, endDate)
    

    
    // update collection to the pivot mask
    harmonizedCollection = harmonizedCollection.select('EVI2_fitted').map(function(img){return img.unmask().updateMask(img_pivot)})
  
  
  
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // Perennial/Semi-Perennial Crops Filter
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    
    var integr =  ee.ImageCollection('projects/mapbiomas-workspace/COLECAO7/integracao')
            .select('classification_'+year).mosaic()
            .remap([36,46,47,48,9, 20], [2,2,2,2,2, 3], 1) 
            .unmask()
            // 1 = all others
            // 2 = perennial
            // 3 = sugarcane
    
    
    // get a value of 2 if the pivot is mostly covered by perennial crops and 3 if sugarcane
    var class_redu = integr.reduceRegions({
                                collection: pivot,
                                reducer: ee.Reducer.mode(),
                                scale: 30,
                                tileScale: 2
                              })
    class_redu = class_redu.map(function(feat){
        return ee.Feature(feat.geometry(),{id: feat.get('label'),  //rename and keep only what's needed
                                           pivot_class: feat.get('mode')})
      }) 
    
    // filter to remove perennial pivots from the next calculations
    pivot = class_redu.filter(ee.Filter.eq('pivot_class', 1))
    
    // filter to select only the perennial/semi-perennial pivots
    var perennial_pivot = class_redu.filter(ee.Filter.neq('pivot_class', 1))
   
   
   
  
    
    
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //         Number of Peaks
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    
    
    // get an output of an image array of equal size to the collection, where every valley in the curve has a value of 1
    var valley = peak_valley_detection.detectValleys(harmonizedCollection.toBands().toArray())

    // flatten the array image back to an image
    var b_name_list = harmonizedCollection.toBands().bandNames()
    var valley_img = valley.arrayProject([0])
                           .arrayFlatten([
                                          b_name_list
                                          ]);
    
      // Map.addLayer(ee.Image(valley_img),{},'valley_img '+year+' '+tile, false )
    
    
    // get the number of peaks in a pixel by the sum of the image collection minus 1
    var n_peaks = valley_img.reduce(ee.Reducer.sum()).subtract(1)
      //Map.addLayer(n_peaks, {min:0,max:6}, 'n_peaks'+path+row, false)
   
    //print(n_peaks)
    
    // reduce the number of peaks to each pivot geometry by the mode
    var reduced_peaks = n_peaks.reduceRegions({
                                  collection: pivot,
                                  reducer: ee.Reducer.mode(),
                                  scale: 30,
                                  tileScale: 16
                                  })
    
  
    reduced_peaks = reduced_peaks.map(function(feat){
        return ee.Feature(feat.geometry(),{id: feat.get('id'),                //rename and keep only what's needed
                                           pivot_class: feat.get('pivot_class'), 
                                           n_peaks: feat.get('mode')})
      })
    //print(reduced_peaks)
    
    // add date to the collection as a band
    harmonizedCollection = harmonizedCollection.map(function(img){
      var date = img.date().millis().int64()
      var img_const = ee.Image(date)
      return img.addBands(img_const.rename('date'))
    })
    
    
    // get the date values in pixels that are considered valleys (transforms 1s to dates values)
    var list = ee.List.repeat(0, valley_img.bandNames().size()) // List of 0s the same size as the collection
    var img_mult = ee.Image.constant(list).where(valley_img, harmonizedCollection.select('date').toBands())
      
      // Map.addLayer(img_mult,{},'img_mult '+year+' '+tile, false)
    
    
    
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //    Best Percentile Definition
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    
    
    // empty list to be used in the percentiles loop
    var error_list = ee.List([])
    var pivot_not_error_list = ee.List([])
    var pivot_error_list = ee.List([])
      
    // loop for testing different percentiles and getting the least amount of errors
    percentiles.forEach(function(percentile){
      
      // reduce each pivot by the majority at each image, where the percentage of agreement needed is the inverse of the percentile
      var redu = img_mult.reduceRegions({
                            collection: reduced_peaks,
                            reducer: ee.Reducer.percentile([percentile]),
                            scale: 30,
                            tileScale: 16
                            })
      
      // list of variables to be kept
      var valley_list = ee.List(['id','n_peaks','pivot_class',
                                 'start_cycle_1','end_cycle_1',
                                 'start_cycle_2','end_cycle_2',
                                 'start_cycle_3','end_cycle_3',
                                 'start_cycle_4','end_cycle_4',
                                 ])
     
      // map a function to select and sequence only the date values
      var valley_date = redu.map(function(feat){
        var arr = ee.Feature(feat).toArray(img_mult.bandNames()).round().int64().toList() //list of vallues of each pivot in each band
        var pre_sequence = arr.removeAll([0]).sort() //remove 0s to get only the valley dates and order it
        var dummy_list = ee.List.repeat(-999, ee.Number(10))
        var sequence = pre_sequence.cat(dummy_list) //sequence of dates with -999s as buffers in case the pivot does not have a second or third cycle
  
        // dictionary to set the sequence of dates as properties
        var dict = {
                    start_cycle_1: sequence.get(0),
                      end_cycle_1: sequence.get(1),
                    start_cycle_2: ee.Algorithms.If(pre_sequence.length().gte(3),sequence.get(1), -999),
                      end_cycle_2: sequence.get(2),
                    start_cycle_3: ee.Algorithms.If(pre_sequence.length().gte(4),sequence.get(2), -999),
                      end_cycle_3: sequence.get(3),
                    start_cycle_4: ee.Algorithms.If(pre_sequence.length().gte(5),sequence.get(3), -999),
                      end_cycle_4: sequence.get(4),
                    }
        feat = ee.Feature(feat).set(dict)
                               .select(valley_list)
        return feat
      })

      // possible errors
      var error_filter = ee.Filter.or(
                          ee.Filter.and(                          //if there are more cycles than peaks
                              ee.Filter.neq('end_cycle_2', -999), 
                              ee.Filter.lt('n_peaks', 2)),
                          ee.Filter.and(                          //if there are more cycles than peaks
                              ee.Filter.neq('end_cycle_3', -999), 
                              ee.Filter.lt('n_peaks', 3)),
                          ee.Filter.and(                          //if there is a start but not an end to a cycle
                              ee.Filter.neq('start_cycle_2', -999),
                              ee.Filter.eq('end_cycle_2', -999)),
                          ee.Filter.and(                          //if there is a start but not an end to a cycle
                              ee.Filter.neq('start_cycle_3', -999),
                              ee.Filter.eq('end_cycle_3', -999)),
                          ee.Filter.and(                          //if there are less less cycles than peaks
                              ee.Filter.eq('start_cycle_2', -999),
                              ee.Filter.gt('n_peaks', 1)),
                          ee.Filter.and(                          //if there are less less cycles than peaks
                              ee.Filter.eq('start_cycle_3', -999),
                              ee.Filter.gt('n_peaks', 2)),
                          ee.Filter.neq('start_cycle_4', -999),   //if there is a fourth cycle
                          ee.Filter.eq('end_cycle_1', -999),      //if there is not a single complete cycle
                          ee.Filter.gt('n_peaks', 3)              //if there are more than 3 peaks detected
                        )

       var pivot_error = valley_date.filter(error_filter) // select pivots that do not have well defined valleys (errors)
       var pivot_not_error = valley_date.filter(error_filter.not()).select(valley_list.slice(0, -2)) // select well defined pivots
      
      
      // get an error metric (percentage of errors)
      var error_percent = pivot_error.size().divide(valley_date.size())
      
    
      pivot_not_error_list = pivot_not_error_list.add(pivot_not_error) // list of results with filtered errors
      pivot_error_list = pivot_error_list.add(pivot_error) // list of results with errors
      error_list = error_list.add(error_percent.multiply(10000).int16()) // list of error values
      
    }) //end percentile  
    
    
    // best percentile definition 
    var error_min = error_list.sort().get(0) // get the smallest error
    var percentil_min_error = ee.List(percentiles).get(error_list.indexOf(error_min)) // get the percentile of the smallest error
    var updated_pivot = ee.FeatureCollection(pivot_not_error_list.get(error_list.indexOf(error_min))) // get the result of that percentile
    var updated_pivot_error = ee.FeatureCollection(pivot_error_list.get(error_list.indexOf(error_min))) // get the errors of that percentile

    
    // print(ee.Number(error_min).divide(10000)) // smaller error
    // print(percentil_min_error) // equivalent percentile
    
    
    
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //      Precipitation and Dates
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    
    // dictionary with null values (to be overwritten later)
    var precip_dict = {
                    precipitation_cycle_1: -999,
                    precipitation_cycle_2: -999,
                    precipitation_cycle_3: -999,
                    days_cycle_1: -999,
                    days_cycle_2: -999,
                    days_cycle_3: -999 
                  }
    
   
    // add accumulated precipitation to each pivot
    var precip_pivot = updated_pivot.map(function(feat){

      feat = feat.set(precip_dict)
    
      
      // list with the quantity of cycles a pivot has 
      var cycles_list = ee.List.sequence(1, feat.get('n_peaks'), 1)
        
        
      // filter collection by cycles; maps the preicipitation calculation in each cycle
      var feat_precip = cycles_list.iterate(function(i, feat){
        
        i = ee.String(i).slice(0,1)
        feat = ee.Feature(feat)  
       
        // initial date range
        var start = ee.Number(feat.get(ee.String('start_cycle_').cat(i)))
        var end = ee.Number(feat.get(ee.String('end_cycle_').cat(i)))
        
        // list with one day increments from the initial start to initial end
        var date_list = ee.List.sequence(start, end, 1000*60*60*24)
        
        // set new start and end based on the percentiles 20 and 80 from the previous list
        var new_start = ee.Number(date_list.reduce(ee.Reducer.percentile([20]))).round().subtract(1296000000) //adding 15 days before the start
        var new_end = ee.Number(date_list.reduce(ee.Reducer.percentile([80]))).round()
        
        var cycle_days = new_end.subtract(new_start).divide(1000*60*60*24).round()
        
        var precipitation = chirps.select('precipitation')
                                  .filterDate(new_start, new_end)
                                  .map(function(image){return image.clip(feat)});
        
      
        // reduce the sum of the collection to the mean value in the pivot geometry
        var prec_day_mm = precipitation.mean().reduceRegions({
                              collection: ee.FeatureCollection(feat),
                              reducer: ee.Reducer.mean(),
                              scale:30,
                              tileScale:16
                            });
        
        
        // set the result as a property 
        return ee.Algorithms.If(cycle_days.gte(70),
                                feat.set(
                                  ee.String('precipitation_cycle_').cat(i), prec_day_mm.first().get('mean'),
                                  ee.String('start_cycle_').cat(i), new_start, 
                                  ee.String('end_cycle_').cat(i), new_end,
                                  ee.String('days_cycle_').cat(i), cycle_days
                                  ),
                                feat.set(
                                  ee.String('precipitation_cycle_').cat(i), -999,
                                  ee.String('start_cycle_').cat(i), -999, 
                                  ee.String('end_cycle_').cat(i), -999,
                                  ee.String('days_cycle_').cat(i), -999,
                                  ee.String('n_peaks'), feat.getNumber('n_peaks').subtract(1)
                                  ))
      }, feat) 
      
      
 
      
      return ee.Feature(feat_precip)
    })
    
    
    
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //         Output Consistency
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    
    var list = [1,2,1]
    list.forEach(function(i){
      
      var j = ee.String(ee.Number(i+1))
      var i = ee.String(ee.Number(i))
      
      var cycle = ee.String('days_cycle_').cat(i)
      var cycle_after = ee.String('days_cycle_').cat(j)
      
      precip_pivot = precip_pivot.map(function(pivot){
        
        return ee.Algorithms.If(
                                pivot.getNumber(cycle).eq(-999).and(pivot.getNumber(cycle_after).neq(-999)),
                                pivot.set(
                                  ee.String('precipitation_cycle_').cat(i), pivot.get(ee.String('precipitation_cycle_').cat(j)),
                                  ee.String('start_cycle_').cat(i), pivot.get(ee.String('start_cycle_').cat(j)), 
                                  ee.String('end_cycle_').cat(i), pivot.get(ee.String('end_cycle_').cat(j)),
                                  ee.String('days_cycle_').cat(i), pivot.get(ee.String('days_cycle_').cat(j)),
                                  
                                  ee.String('precipitation_cycle_').cat(j), -999,
                                  ee.String('start_cycle_').cat(j), -999, 
                                  ee.String('end_cycle_').cat(j), -999,
                                  ee.String('days_cycle_').cat(j), -999
                                  ),
                                pivot
                                )
        
        
      })
    })

    
    // set null properties (perennials and errors) for consistency in the output
    var null_dict = {
                    n_peaks        :-999,
                    start_cycle_1  :-999,
                    end_cycle_1    :-999,
                    start_cycle_2  :-999,
                    end_cycle_2    :-999,
                    start_cycle_3  :-999,
                    end_cycle_3    :-999,
                    }
    
    
    // set the remaining properties of the perennial pivots
    perennial_pivot = perennial_pivot.map(function(feat){
                                        return feat.set(null_dict)
                                                   .set(precip_dict)
                                        })    
    
    // set the remaining properties of the error pivots
    updated_pivot_error = updated_pivot_error.map(function(feat){
                                          return ee.Feature(feat.geometry())
                                                    .set(null_dict)
                                                    .set(precip_dict)
                                                    .set('pivot_class', 0,
                                                         'n_peaks', -999,
                                                         'id', feat.get('id'))
                                                    
                                        })                                  
    
    
    //merges the collections of every selected path/row
    grids_peaks = grids_peaks.merge(precip_pivot.merge(perennial_pivot).merge(updated_pivot_error)) // and merges the perenial pivots
    
  }) //end op

  //print(grids_peaks)

  // export
  Export.table.toAsset({
  collection: grids_peaks.distinct('id'), //deletes overlapping pivots, which normally occur in scene borders 
  description: filename +'_'+ year, 
  assetId: outputCollection + filename +'_'+ year,
      
      
    })


  
}) //end years






