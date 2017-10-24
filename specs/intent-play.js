const testSubject = require( "../index" );
const serviceRequest = require( `./requests/intent-play.json` );

testSubject.handler( serviceRequest, {}, ( err, response ) => {
  console.log( err );
  console.log( response );
})