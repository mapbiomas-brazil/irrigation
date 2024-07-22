<div>
    <img src='../assets/logo.png' height='auto' width='200' align='right'>
    <h1>Other irrigation systems</h1>
</div>

Developed by ***Remap Geotecnologia Ltda***.

## About

This folder contains the scripts to classify and post-process the **other irrigation systems** subclass.

We recommend that you read the [Irrigation Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the classification methodology can be found in there.

## How to use

First, you need to copy the scripts in this folder to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab** and create the following directory structure:

 - MAPBIOMAS/C9/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/RESULTS
 - MAPBIOMAS/C9/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/SAMPLES

and create one **Image Collections**:

 - MAPBIOMAS/C9/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/RESULTS/**RAW**

### Classification

To run the classification, follow these steps:

1. Open the script **irrigation/other-irrigation-systems/classification.js**;

2. On **line 2** (variable `api`), set the path to the [api.js](../utils/api.js) script you copied to your GEE account;

3. On **line 5** (variable `normalization`), set the path to the [normalization.js](../utils/normalization.js) script you copied to your GEE account;

5. On **line 10** (variable `year`), set the year you want to classify;

6. On **line 16** (variable `outputAsset`), set the output path to the classification results;

7. On **line 34** (variable `samplesAssetDir`), set path to the previously collected samples;

8. Run the scripts;

9. On the map, move to the northeast region of Brazil, and click in on of the highlighted cities;

10. On the **Task tab** (right panel), run the classification task;

11. Repeat the steps **9 and 10** if you want to classify another city.

### Post-processing

To run the post-processing, follow these steps:

1. Open the script **irrigation/other-irrigation-systems/spatial_temporal_filter.js**;

2. On **line 2** (variable `input`), set the path to the raw classification result;

3. On **line 5** (variable `output`, set the path to the filtered result;

4. On **lines 8 and 9** (variables `startYear` and `endYear`), set the years interval you want to filter;

5. Run the script.
