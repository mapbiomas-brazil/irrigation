// set the path to the raw classification result:
var input = 'users/your_username/MAPBIOMAS/C9/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/RESULTS/RAW'

// set the path for the filtered result
var output = 'users/your_username/MAPBIOMAS/C9/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/RESULTS/SPATIAL_TEMPORAL_FILTERED'

// set the years interval you want to filter:
var startYear = 2012;
var endYear = 2016;

var brasilMask = ee.Image('projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/COLECAO5/country-raster');
var class_of_reference = 1;
var years = range(startYear, endYear - startYear + 1);

var offset = 2;
var global_threshold = 3;

var outputAsset = 'users/your_username/MABIOMAS/C6/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/RESULTS/RAW';

var imageCollection = ee.List.sequence(startYear, endYear)
  .map(function (year) {
    var yearMosaic = ee.ImageCollection(input)
      .filterMetadata('year', 'equals', year)
      .max();

    return yearMosaic.set('year', year)
  })

var collection = ee.ImageCollection(imageCollection).sort('year').toList(40);

function range(start, count) {
  return Array.apply(0, Array(count))
    .map(function (element, index) {
      return index + start;
    });
}

var break_list = function (list, index, offset, min, max, threshold) {
  var start = index - offset
  var end = index + offset
  if (start < min) {
    threshold = 1 + threshold + start
    start = min
  }
  if (end > max) {
    threshold = 1 + threshold + (max - end)
    end = max
  }
  var left = list.slice(start, index)
  var center = ee.Image(list.get(index))
  var right = list.slice(index + 1, end + 1)
  return [left, center, right, threshold]
}

var images = [];

for (var index = 0; index <= years.length - 1; index++) {
  var image_without_filter = ee.Image(collection.get(index))
  var nodes = break_list(collection, index, offset, 0, years.length - 1, global_threshold);
  var left = nodes[0]
  var center = nodes[1]
  var right = nodes[2]
  var threshold = nodes[3]

  var year = years[index];

  center = center.unmask(null).eq(class_of_reference);
  left = ee.ImageCollection(left);
  right = ee.ImageCollection(right);

  var sides = ee.ImageCollection(left.merge(right)).map(function (img) {
    return ee.Image(img).eq(class_of_reference);
  }).sum();

  var mask = center.add(sides.eq(0)).neq(2);
  var image = center.add(sides).gte(threshold + 1);

  var image_with_temporal = ee.Image(center.add(image)).updateMask(mask).gte(1)
    .set('year', year);

  collection = collection.set(index, image_with_temporal);

  //spatial filter
  var kernel_ = [[1, 1, 1, 1, 1],
  [1, 2, 2, 2, 1],
  [1, 2, 2, 2, 1],
  [1, 2, 2, 2, 1],
  [1, 1, 1, 1, 1]];

  var kernel = ee.Kernel.fixed(5, 5, kernel_, -2, -2, false);

  var image_with_spatial = image_with_temporal.unmask(null).convolve(kernel).gte(15)
    .selfMask();

  images.push(image_with_spatial.rename("classification_" + year));
}

var image = ee.Image(images);

var vis = {
  bands: ['classification_' + endYear],
  min: 0,
  max: 1,
  palette: ['WHITE', 'BLACK'],
  format: 'png'
}

var raw = ee.ImageCollection(imageCollection).filterMetadata('year', 'equals', endYear).first().rename('classification_' + endYear);

Map.addLayer(raw.unmask(), vis, 'Raw')
Map.addLayer(image.unmask(), vis, 'Temporal-Spatial Filtered')

var filename = 'semiarid_temporal_spatial_filter_' + year + '_v1';

Export.image.toAsset({
  image: image_with_spatial.byte(),
  description: filename,
  assetId: filename,
  scale: 30,
  region: brasilMask.geometry(),
  maxPixels: 1.0E13,
});
