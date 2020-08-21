<div>
    <img src='https://agrosatelite.com.br/wp-content/uploads/2019/02/logo_horizontal_negativo.png' height='auto' width='200' align='right'>
    <h1>Other irrigation systems</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada***

## About

This folder contains the scripts to classify and post-process the **other irrigation systems** subclass.

We recommend that you read the Irrigation Appendix (**COLOCAR LINK**) of the Algorithm Theoretical Basis Document (**ATBD**), since important informations about the classification methodology can be found in there.

## How to use

First, you need to copy the scripts in this folder to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab** and create the following directory structure:

 - MAPBIOMAS/C5/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/RESULTS
 - MAPBIOMAS/C5/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/SAMPLES

and create one Image Collections:

 - MAPBIOMAS/C5/IRRIGATION/OTHER_IRRIGATION_SYSTEMS/RESULTS/**RAW**

### Sampling

To run the sampling, follow these steps:

1. Open the script **irrigation/other-irrigation-systems/sampling.js**;

2. On **line 1** (variable `api`), set the path to the [api.js](./utils/api.js) script you copied to your GEE account;

3. On **line 2** (variable `blard`), set the path to the [blard.js](./utils/blard.js) script you copied to your GEE account;

4. On **line 3** (variable `cloud`), set the path to the [cloud.js](./utils/cloud.js) script you copied to your GEE account;

5. On **line 22** (variable `YEAR`), set the year of the reference map that will be used for the sampling;

6. On **line 27** (variable `SAMPLES_EXPORT`), set the output path of the samples;

7. On **line 151** (variable `agriculture`), set the asset that will be used as agriculture mask for the sampling;

8. On **line 153** (variable `pivots`), set the asset that will be used as pivot mask for the sampling.

9. Run the script.

10. On the map, move to the northeast region of Brazil, and click in on of the highlighted cities;

11. On the **Task tab** (right panel), run the sampling task.

12. Repeat the steps **10** and **11** if you want to collect samples in another city.

### Classification

To run the classification, follow these steps:

1. Open the script **irrigation/other-irrigation-systems/classification.js**;

2. On **line 1** (variable `api`), set the path to the [api.js](./utils/api.js) script you copied to your GEE account;

3. On **line 2** (variable `blard`), set the path to the [blard.js](./utils/blard.js) script you copied to your GEE account;

4. On **line 3** (variable `cloud`), set the path to the [cloud.js](./utils/cloud.js) script you copied to your GEE account;

5. On **line 7** (variable `YEAR`), set the year you want to classify;

6. On **line 15** (variable `OUTPUT_ASSET`), set the output path for the classification results;

7. On **line 26** (variable `samplesRootPath`), set path to the previously collected samples;

8. On the map, move to the northeast region of Brazil, and click in on of the highlighted cities;

9. On the **Task tab** (right panel), run the classification task.

10. Repeat the steps **8** and **9** if you want to classify another city.

### Post-processing

To run the post-processing, follow these steps:

1. Open the script **irrigation/other-irrigation-systems/temporal_spatial_filter.js**;

2. On **line 1** (variable `input`), set the path to the classification result;

3. On **line 2** (variable `output`, set the path for the filtered result;

4. On **lines 4 and 5** (variables `startYear` and `endYear`), set the years interval you want to filter;

5. Run the script.
