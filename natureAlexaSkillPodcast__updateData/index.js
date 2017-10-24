const xmlStringToJson = require( "xml2js" ).parseString;
const fs = require( "fs" );
const AWS = require( "aws-sdk" );

AWS.config.region = "eu-west-1";

const podcastEndpoint = "http://feeds.nature.com/nature/podcast/current";

exports.handler = function ( event, context, callback ) {
	// Start here
	// every hour start the process
	// download new copy of data

	const dynamodb = new AWS.DynamoDB();

	xmlStringToJson( fs.readFileSync( "data.xml" ), ( err, result ) => {
		
		if ( err ) {
			console.log( "Error with the data.xml file" );
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

			dynamodb.putItem(params, function(err, data) {
				if (err) console.log(err, err.stack);
				else     console.log(data);
			});

		});

	});

}
	