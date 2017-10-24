const testSubject = require( "../index" );
const serviceRequest = require( `./requests/intent-stop.json` );

testSubject.handler( serviceRequest, {}, ( err, response ) => {
  console.log( err );
  console.log( response );
})