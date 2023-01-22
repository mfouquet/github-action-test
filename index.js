const core = require('@actions/core');
const github = require('@actions/github');

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  const context = JSON.stringify(github.context, undefined, 2)
  console.log(`The event payload: ${payload}`);
  console.log(`The event context: ${context}`);
  console.log(process.argv);
  console.log(process.env.FILES_CHANGED);
} catch (error) {
  core.setFailed(error.message);
}