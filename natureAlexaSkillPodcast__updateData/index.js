const xmlStringToJson = require( "xml2js" ).parseString;
const fs = require( "fs" );
const AWS = require( "aws-sdk" );

AWS.config.region = "eu-west-1";

const podcastEndpoint = "http://feeds.nature.com/nature/podcast/current";

const dynamodb = new AWS.DynamoDB();

function createTable () {
	return new Promise ( ( resolve, reject ) => {

		const params = {
			AttributeDefinitions: [{
				AttributeName: "id", 
				AttributeType: "S"
			}, 
			{
				AttributeName: "url", 
				AttributeType: "S"
			}], 
			KeySchema: [{
				AttributeName: "id", 
				KeyType: "HASH"
			}, 
			{
				AttributeName: "url", 
				KeyType: "RANGE"
			}], 
			ProvisionedThroughput: {
				ReadCapacityUnits: 5, 
				WriteCapacityUnits: 5
			}, 
			TableName: "naturePodcasts"
		};

		dynamodb.createTable( params, ( err, data ) => {
			if ( err ) {
				reject( err );
			}
			console.log( data );
			waitUntil( "tableExists" ).then( resolve );
   		});

	});
}

function deleteTable () {
	return new Promise ( ( resolve, reject ) => {

		const params = {
			"TableName": "naturePodcasts"
		};

		dynamodb.deleteTable( params, ( err, data ) => {
			if ( err ) {
				reject( err );
			}
			console.log( data );
   			waitUntil( "tableNotExists" ).then( resolve );
   		});

	});
}

function waitUntil ( eventName ) {
	return new Promise ( ( resolve, reject ) => {
		const params = {
			"TableName": "naturePodcasts"
		};
		dynamodb.waitFor( eventName, params, ( err, data ) => {
			if ( err ) {
				reject( err );
			} else {
				console.log( data );
				resolve();
			}
		});

	});

}

function postData () {

	return new Promise ( ( resolve, reject ) => {

		xmlStringToJson( fs.readFileSync( "data.xml" ), ( err, result ) => {
			
			if ( err ) {
				reject( err );
				return;
			}
			
			result.rss.channel[ 0 ].item.forEach( ( podcast, i ) => {

				const params = {
					Item: {
						"id": {
							S: i.toString()
						}, 
						"url": {
							S: podcast.link[ 0 ]
						}
					}, 
					ReturnConsumedCapacity: "TOTAL", 
					TableName: "naturePodcasts"
				};

				dynamodb.putItem( params, ( err, data ) => {
					if ( err ) {
						reject( err );
					} else {
						console.log( data );
						resolve();
					}
				});

			});

		});

	});

}

exports.handler = function ( event, context, callback ) {
	// Start here
	// every hour start the process
	// download new copy of data

	deleteTable()
		.then( createTable )
		.then( postData )
		.catch( console.log );

}
	