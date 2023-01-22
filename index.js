const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  // console.log(process.env.FILES_CHANGED);

  const files = JSON.parse(process.env.FILES_CHANGED);

  files.forEach(file => {
    console.log(file);
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