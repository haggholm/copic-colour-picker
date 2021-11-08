# Copic Colour Picker

Quick and dirty colour picker for Copic markers.

The JSON data for colours were nabbed from https://www.swatchtool.com/copic.

Type an RGB value into the input field, e.g.
`123,200,65` or `#ff08a2` and select a colour space
(RGB, HSV, Lab); the Euclidean difference between each Copic colour
and the input value will be selected and used to compute a weighted
difference (or similarity), and the table sorted accordingly.
(Weighted: an _extremely_ crude calculation of max differences;
may not make sense in every colour space.)

The code is awful. This is a quick and dirty tool just to, well, pick out
marker colours, not set up a long-term software project.

Usable via https://raw.githack.com/haggholm/copic-colour-picker/main/index.html