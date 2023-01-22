const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  // console.log(process.env.FILES_CHANGED);

  const files = JSON.parse(process.env.FILES_CHANGED);

  files.forEach(file => {
    if (file.includes('.css')) {
      fs.readFile(file, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(data);
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
  //   if (err) {
  //     console.error(err);
  //     return;
  //   }
  //   console.log(data);
  // });

} catch (error) {
  core.setFailed(error.message);
}