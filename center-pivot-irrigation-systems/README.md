<div>
    <img src='https://agrosatelite.com.br/wp-content/uploads/2019/02/logo_horizontal_negativo.png' height='auto' width='200' align='right'>
    <h1>Center pivot irrigation systems</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada Ltda.***

## About

This folder contains the scripts to classify and post-process the **center pivot irrigation systems** subclass.

We recommend that you read the [Irrigation Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds) of the Algorithm Theoretical Basis Document (**ATBD**), since important informations about the classification methodology can be found in there.

## How to use

First, you need to copy the scripts (javascript only) in this folder to your Google Earth Engine (**GEE**) account.

Then, in your **GEE** account, go to the **Assets tab** and create the following directory structure:

 - MAPBIOMAS/C6/IRRIGATION/CENTER_PIVOT_IRRIGATION_SYSTEMS/RESULTS

and create one **Image Collections**:

 - MAPBIOMAS/C6/IRRIGATION/CENTER_PIVOT_IRRIGATION_SYSTEMS/RESULTS/**RAW**

## Classification

Open the script [center-pivot-irrigation-systems/semantic_segmentation.ipynb](https://colab.research.google.com/github/mapbiomas-brazil/irrigation/blob/mapbiomas50/center-pivot-irrigation-systems/semantic_segmentation.ipynb) in Google Colab and follow the instructions there.

## Post-processing

To run the post-processing, follow these steps:

1. Open the script (**[center-pivot-irrigation-systems/spatial_temporal_filter.js**]);

2. On **line 4** (variable `input`), set the path to the raw classification result;

3. On **line 7** (variable `output`), set the path for the filtered result;

4. Run the script.
