const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

try {
  // const files = JSON.parse(process.env.FILES_CHANGED);

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
        const altRegex = /alt="([^""]*)"/g;
        data.split(/\r?\n/).forEach(line =>  {
          if (line.includes('alt')) {
            altRegex.lastIndex = 0;
            const text = line.trim();
            const regexResult = altRegex.exec(text);
            //@ts-expect-error later
            const status = determineAltTextStatus(regexResult[1], false);
            if (status !== 'written' && status !== 'decorative') {
              core.warning(`The alt text "${regexResult[1]}" fails for the following reason: ${status}`);
            }
          }
        });
      });
    } else {
      console.log(`Nothing to check in this file: ${file}`);
    }
  });


  // fs.readFile('./example/example.html', 'utf8', (err, data) => {

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

const determineAltTextStatus = (text, isPlugin) => {
  const emojiRegex = /\p{Emoji_Presentation}/gu;

  if (emojiRegex.test(text)) {
    const repetitiveEmojiRegex =
      /([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2030-\u3300]|[\u00A9-\u00AE]|[\uFE0F])(\1){1,}/g;

    const denseEmojiRegex = /\p{Emoji_Presentation}{2,}/gu;

    //repetitive emoji
    if ((text.match(repetitiveEmojiRegex) || []).length > 0) {
      return 'repetitive emoji';
    }

    //dense emoji
    if ((text.match(denseEmojiRegex) || []).length > 0) {
      return 'dense emoji';
    }

    //excessive emoji
    if (
      text.length > 20 &&
      (text.match(emojiRegex) || []).length / text.length >= 0.1
    ) {
      return 'excessive emoji';
    }

    return 'emoji usage';
  }

  const uppercaseText = text.toUpperCase();
  //redundant info
  if (
    uppercaseText.indexOf('PICTURE OF') > -1 ||
    uppercaseText.indexOf('SCREENSHOT OF') > -1 ||
    uppercaseText.indexOf('IMAGE OF') > -1 ||
    uppercaseText.indexOf('PICTURE SHOWING') > -1 ||
    uppercaseText.indexOf('SCREENSHOT SHOWING') > -1 ||
    uppercaseText.indexOf('IMAGE SHOWING') > -1
  ) {
    return 'redundant info';
  }

  // length
  if (text.length > 200) {
    return 'character count';
  }

  //keyword stuffing
  const textStrippedPunctuation = text.replace(/[,.!]/g, '');
  const textStrippedCommonWords = textStrippedPunctuation.replace(
    /\ba|and|for|the|with|that|all|they|she|you|your|our|will|shall|have|has|are|way|need|needs\b/gi,
    ''
  );

  // separate string into array of lowercase words
  const words = textStrippedCommonWords.toLowerCase().split(/\s+/g);

  // form object of word counts
  const wordCounts = {};
  words.forEach((word) => {
    //@ts-expect-error update later
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  const containsMinimumWordCount = words.length > 6;
  let containsRepeatedWords = false;
  for (const key in wordCounts) {
    //@ts-expect-error update later
    if (wordCounts[key] > 1) {
      containsRepeatedWords = true;
      break;
    }
  }

  if (containsMinimumWordCount && containsRepeatedWords) {
    for (const key in wordCounts) {
      //@ts-expect-error update later
      const percentage = (wordCounts[key] / words.length) * 100;

      if (percentage >= 50) {
        return 'keyword stuffing';
        break;
      }
    }
  }

  if (text === '') {
    return isPlugin ? 'to-do' : 'decorative';
  }

  return 'written';
};