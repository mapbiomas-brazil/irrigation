<div>
    <img src='https://agrosatelite.com.br/wp-content/uploads/2019/02/logo_horizontal_negativo.png' height='auto' width='200' align='right'>
    <h1>Center Pivot Irrigation Dynamics</h1>
</div>

Developed by ***Agrosatélite Geotecnologia Aplicada***.


## About

This folder contains the scripts necessary to obtain the **Center Pivot Irrigation Dynamics** product. This product is a ***beta*** version and these scripts should be used with caution. 

We recommend that you read the [Irrigation Appendix of the Algorithm Theoretical Basis Document (ATBD)](https://mapbiomas.org/download-dos-atbds), since important informations about the methodology can be found in there.

<br>

---

## How to use

### Instance Segmentation

#### Using the already trained MapBiomas Neural Network:

1.

#### To train your own Neural Network

1.

<br>

### Instance Segmentation Post-processing

To run the post-processing, follow these steps:

1. **Erosion Filter**:

    1. Open the script **irrigation/pivot_dynamics/02A_erosion_filter.js**;

    2. On **line 48** (variable `years`) set a list of years you want to process;

    3. On **line 52** (variable `output`) set the output path for an imageCollection. On **line 54** (variable `filename`) set the individual filename prefix for your output; 

    4. On **line 57** (variable `tilesCollections`) set the path for the imageCollection containing the results you uploaded from the Neural Network;

    5. Run the script.

2. **Spatial and Dilation Filter**:

    1. Open the script **irrigation/pivot_dynamics/02B_spatial_and_dilation_filter.js**;

    2. On **line 44** (variable `years`) set a list of years you want to process;

    3. On **line 47** (variable `output`) set the output path for an imageCollection. On **line 50** (variable `filename`) set the individual filename prefix for your output; 

    4. On **line 70** (variable `raw_erosion`) set the path to the erosion filter results;

    5. Run the script.

3. **Tamporal and Spatial Filter**:

    1. Open the script **irrigation/pivot_dynamics/02C_temporal_spatial_filter.js**;

    2. On **line 48** (variable `col`) set the path to the spatial and dilation filter results;

    3. On **line 51** (variable `years`) set a list of years you want to process;

    4. On **line 54** (variable `output`) set the output folder for the results. On **line 57** (variable `filename`) set the individual filename prefix for your output; 

    5. Run the script.

<br>

### Individual Pivot Information

1. **Pivot Information**

    1. Open the script **irrigation/pivot_dynamics/03A_pivot_information.js**;

    2. On **line 77** (variable `years`) set a list of years you want to process;

    3. On **line 81** (variable `op`) set a list of Landsat scenes (Path/Row) you want to process;

    4. On **line 136** (variable `outputCollection`) set the output path for the results. On **line 139** (variable `filename`) set the individual filename prefix for your output; 

    5. On **line 237** (variable `pivot`) set the path for the post-processing results;

    6. Run the script. 

2. **Rasterize Pivots (OPTIONAL)**

    1. Open the script **irrigation/pivot_dynamics/03B_rasterize_pivots.js**;

    2. On **line 27** (variable `years`) set a list of years you want to process;

    4. On **line 31** (variable `output_destination`) set an imageCollection path for the results. On **line 32** (variable `output_name`) set the individual filename prefix for your output; 

    5. On **line 38** (variable `pivot`) set the path for the pivot information results;

    6. On **line 55** (variable `img_pivot`) you can change the band names for the output;

    6. Run the script. 