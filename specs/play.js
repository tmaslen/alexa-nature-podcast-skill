const test = require( "../natureAlexaSkillPodcast__endpoint/index" );
const requestType = process.argv[ 2 ];
const serviceRequest = require( `./requests/${requestType}.json` );
const context = {};

test.handler( serviceRequest, context, ( err, response ) => {
  console.log( err );
  console.log( response );
});