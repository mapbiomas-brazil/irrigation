/**
 * @name
 *      PEAKS AND VALLEYS DETECTION
 * 
 * @description
 *      This functions use an array image as input and detec variations in the array of each pixels.
 *      Looking at it as a a sequence of values in a curve, the script returns a list where the value is true (1)
 *      if that point was an inflection in the curve. The peaks version returns if the inflection was downwards
 *      and the valleys if it was upwards.    
 * 
 * @author
 *      Original Author: Noel Gorelick (stackoverflow)
 *        https://stackoverflow.com/questions/66026795/how-to-apply-a-code-built-for-arrays-to-an-image-collection-after-using-toarray
 *        https://code.earthengine.google.com/e3265400b32b3ade1d4df2a7f920d8a5
 * 
 *      Modified by: Remap
 *      mapbiomas@remapgeo.com
 *
 * @version
 *      MapBiomas Collection 9.0 (beta)
 * 
 */

// function to get the position of the peaks in a time-series
var detectPeaks = function(image) {
  // Compute the forward and backwards difference.
  // Note: these arrays are 1 smaller than the input 
  // because the first/last pt doesn't have a prev/next neighbor.
  var left = image.arraySlice(0, 0, -1)
  var right = image.arraySlice(0, 1)
  var fwd = left.subtract(right)
  var back = right.subtract(left)
  
  // Test if each position is greater than its next/prev neighbor?
  var next = fwd.gt(0)
  var prev = back.gt(0)
    
  // Test if the first/last point is itself a peak
  var first = image.arrayGet([0]).gt(image.arrayGet([1])).toArray()
  var last = image.arrayGet([-1]).gt(image.arrayGet([-2])).toArray()
  
  // Reattach the end points.
  next = next.arrayCat(last, 0)
  prev = first.arrayCat(prev, 0)
  
  
  // Set to 1 when both next and prev are greater than 0 and get the result. 
  // Results in an array with the position of the peaks  
  var peaks = next.and(prev)
  return peaks
}


// function to get the position of the valleys in a time-series
var detectValleys = function(image) {
  // Compute the forward and backwards difference.
  // Note: these arrays are 1 smaller than the input 
  // because the first/last pt doesn't have a prev/next neighbor.
  var left = image.arraySlice(0, 0, -1)
  var right = image.arraySlice(0, 1)
  var fwd = left.subtract(right)
  var back = right.subtract(left)
  
  // Test if each position is greater than its next/prev neighbor?
  var next = fwd.gt(0)
  var prev = back.gt(0)
    
  // Test if the first/last point is itself a peak
  var first = image.arrayGet([0]).gt(image.arrayGet([1])).toArray()
  var last = image.arrayGet([-1]).gt(image.arrayGet([-2])).toArray()
  
  // Reattach the end points.
  next = next.arrayCat(last, 0)
  prev = first.arrayCat(prev, 0)
  
  
  // Set to 1 when both next and prev are greater than 0 and get the result. 
  // Results in an array with the position of the valleys
  var valley = (next.not()).and(prev.not())
  return valley
}



exports.detectPeaks = detectPeaks
exports.detectValleys = detectValleys