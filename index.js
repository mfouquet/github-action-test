const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

try {
  const files = JSON.parse(process.env.FILES_CHANGED);

  files.forEach(file => {
    if (file.includes('.css')) {
      fs.readFile(file, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        const textColorRegex = /\scolor: #(.*)/g;
        const bgColorRegex = /background-color: #(.*)/g;

        let contrastRatio = 0;
        let bgColor;
        let fgColor;
        if (data.includes('background-color: ')) {
          // Get the background color
          const foundBgColor = bgColorRegex.exec(data);
          bgColor = foundBgColor
            ? ConvertHexToRgba(foundBgColor[1])
            : ConvertHexToRgba('#FFFFFF');

          // Get the foreground (text) color
          const foundFgColor = textColorRegex.exec(data);
          fgColor = foundFgColor
            ? ConvertHexToRgba(foundFgColor[1])
            : ConvertHexToRgba('#000000');

          contrastRatio = GetContrastRatio(bgColor, fgColor, true);
        }

        if (contrastRatio === 0) {
          // do nothing
        } else if (contrastRatio > 0 && contrastRatio < 4.5) {
          core.warning(`This doesn't pass contrast standards at ${contrastRatio}:1. ${ConvertRgbaToHex(
            //@ts-expect-error later
            bgColor,
            true
            //@ts-expect-error later
          )} ${ConvertRgbaToHex(fgColor, true)}`)
        }
      });
    } else if (file.includes('.html')) {
      fs.readFile(file, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(data);
      });
    } else {
      console.log(`Nothing to check in this file: ${file}`);
    }
  });


  // fs.readFile('./example/example.css', 'utf8', (err, data) => {

  // });

} catch (error) {
  core.setFailed(error.message);
}


const ConvertHexToRgba = (hex) => {
  const normalizedHex = hex.startsWith('#')
    ? hex.substring(1, hex.length + 1)
    : hex;

  const alpha = parseInt(normalizedHex.slice(6, 8), 16) / 255 || 1;

  const rgba = {
    r: parseInt(normalizedHex.slice(0, 2), 16),
    g: parseInt(normalizedHex.slice(2, 4), 16),
    b: parseInt(normalizedHex.slice(4, 6), 16),
    a: Number(alpha.toFixed(2)),
  };

  return rgba;
};

const ConvertRgbaToHex = (
  rgba,
  includeHashtag,
  includeAlpha
) => {
  const addPadding = (color) => {
    return color.length === 1 ? '0' + color : '' + color;
  };

  return `${includeHashtag ? '#' : ''}${addPadding(
    Math.round(rgba.r).toString(16)
  )}${addPadding(Math.round(rgba.g).toString(16))}${addPadding(
    Math.round(rgba.b).toString(16)
  )}${
    includeAlpha && rgba.a
      ? addPadding(Math.round(rgba.a * 255).toString(16))
      : ''
  }`;
};

const GetContrastRatio = (
  firstColor,
  secondColor,
  roundResult
) => {
  const getLuminance = (color) => {
    // http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
    const RsRGB = color.r / 255;
    const GsRGB = color.g / 255;
    const BsRGB = color.b / 255;
    let R;
    let G;
    let B;

    if (RsRGB <= 0.03928) {
      R = RsRGB / 12.92;
    } else {
      R = Math.pow((RsRGB + 0.055) / 1.055, 2.4);
    }
    if (GsRGB <= 0.03928) {
      G = GsRGB / 12.92;
    } else {
      G = Math.pow((GsRGB + 0.055) / 1.055, 2.4);
    }
    if (BsRGB <= 0.03928) {
      B = BsRGB / 12.92;
    } else {
      B = Math.pow((BsRGB + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };

  let result =
    (Math.max(getLuminance(firstColor), getLuminance(secondColor)) + 0.05) /
    (Math.min(getLuminance(firstColor), getLuminance(secondColor)) + 0.05);

  if (roundResult) {
    const stringResult = String(result);
    if (stringResult.indexOf('.') !== -1) {
      const numArray = stringResult.split('.');
      if (numArray.length === 1) {
        result = Number(stringResult);
      } else {
        result = Number(
          numArray[0] + '.' + numArray[1].charAt(0) + numArray[1].charAt(1)
        );
      }
    }
    result = Number(result.toFixed(2));
  }

  return result;
};