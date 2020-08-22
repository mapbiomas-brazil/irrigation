// Raw collection of the center pivot irrigation systems classification
// Each image must be a binary raster with 0 (background) and 1 (pivots)
// and contain the year property as an integer
var input = 'users/your_username/MAPBIOMAS/C5/IRRIGATION/CENTER_PIVOT_IRRIGATION_SYSTEMS/RESULTS/RAW';

// export results
var output = 'users/your_username/MAPBIOMAS/C5/IRRIGATION/CENTER_PIVOT_IRRIGATION_SYSTEMS/RESULTS/TEMPORAL_SPATIAL_FILTERED';

// Temporal filter
var window_size = 5;

// Spatial filter
var radiusKernel = 60;

/*  END SETTINGS  */

var brasilMask = ee.Image("users/agrosatelite_mapbiomas/COLECAO_5/PUBLIC/GRIDS/BIOMAS_IBGE_250K_BUFFER");

// Define spatial kernels

var offset = (window_size-1) / 2;

var erosionKernel = ee.Kernel.circle({radius: radiusKernel, units: 'meters'});

var dilatationKernel = ee.Kernel.circle({radius: radiusKernel, units: 'meters'});

var collection = ee.ImageCollection(input)
  .map(function(image){
    return image.unmask(null);
  });

var join = ee.Join.saveAll({
    matchesKey: 'images'
  });

var diffFilter = ee.Filter.maxDifference({
  difference: offset,
  leftField: 'year',
  rightField: 'year'
});

var threeNeighborJoin = join.apply({
  primary: collection,
  secondary: collection,
  condition: diffFilter
});

var filteredCollection = ee.ImageCollection(threeNeighborJoin
  .map(function(image){
    image = ee.Image(image);

    var imagesList = ee.List(image.get('images'));

    var neighborsBefore = ee.ImageCollection(imagesList)
      .filterMetadata('year', 'less_than', image.get('year'))

    var neighborsAfter = ee.ImageCollection(imagesList)
      .filterMetadata('year', 'greater_than', image.get('year'))

    var neighborsBeforeMask = ee.Image(ee.Algorithms.If(neighborsBefore.size().gte(1),
      neighborsBefore.sum().gte(1),
      image)); // in the first year, 2000, we don't apply the temporal filter
    var neighborsAfterMask = ee.Image(ee.Algorithms.If(neighborsAfter.size().gte(1),
      neighborsAfter.sum().gte(1),
      image)); // in the last year, 2019, we don't apply the temporal filter

    var neighborsIncrement = neighborsBeforeMask.eq(1).and(neighborsAfterMask.eq(1)).selfMask();
    var neighborsDecrement = neighborsBeforeMask.eq(0).and(neighborsAfterMask.eq(0));

    // Apply the temporal filter
    var image = image.blend(neighborsIncrement).updateMask(neighborsDecrement.not()).unmask();

    // Apply the spatial filter
    var openedImage = image.focal_min({kernel: erosionKernel, iterations: 2})
                          .focal_max({kernel: dilatationKernel, iterations: 2});

    return openedImage.eq(1).selfMask().copyProperties(image, image.propertyNames()).set('images', imagesList);
}));


var finalMaps = ee.Image(filteredCollection.toBands());

Map.addLayer(finalMaps.select(collection.size().subtract(1)), {min: 0, max: 1, palette: '#1d4eff'}, 'pivots - last year');

Export.image.toAsset({
  image: finalMaps.byte().updateMask(brasilMask),
  description: 'center_pivot_irrigation_systems_final_maps',
  assetId: output,
  scale: 30,
  region: brasilMask.geometry(),
  maxPixels: 1E13,
  pyramidingPolicy: {'.default': 'mode'}
});
