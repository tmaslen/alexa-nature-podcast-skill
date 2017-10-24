'use strict';

const AWS = require( "aws-sdk" );

AWS.config.region = "eu-west-1";

const alexaServiceRequest = require( "../lib/alexa-service-request" );

function buildSpeechletResponse ( title, output, repromptText, shouldEndSession ) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function introducePodcast ( launchRequest, session, callback ) {

    console.log(`introducePodcast requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    const sessionAttributes = {};
    const cardTitle = "Welcome";
    const speechOutput = "Say play to start litening to the latest Nature podcast. Each week Nature publishes a free audio show. Every show features highlighted content from the week's edition of Nature including interviews with the people behind the science, and in-depth commentary and analysis from journalists covering science around the world.";
    const repromptText = "Want to play the podcast?";
    const shouldEndSession = false;

    callback(
        null,
        buildSpeechletResponse(
            cardTitle,
            speechOutput,
            repromptText,
            shouldEndSession
        )
    );

}

function getLatestPodcastUrl ( podcastEpisode ) {

  podcastEpisode = podcastEpisode || 0;

  return new Promise( ( resolve, reject ) => {

    const dynamodb = new AWS.DynamoDB();

    const params = {
      "ExpressionAttributeValues": {
        ":a": {
          "S": podcastEpisode.toString()
        }
      },
      "FilterExpression": "id = :a",
      "TableName": "naturePodcasts"
    };

    dynamodb.scan( params, ( err, data ) => {
      if ( err ) {
        reject( err );
      }
      const podcastUrl = (data && data.Items && data.Items.length > 0) ? data.Items[ 0 ].url.S : null;
      resolve( podcastUrl );
    });

  });
}

function getPodcastEpisode( session ) {
  let podcastEpisode = 0;

  if ( "attributes" in session && "currentPodcastEpisode" in session.attributes ) {
    podcastEpisode = parseInt( session.attributes.currentPodcastEpisode, 10 );
  }

  return podcastEpisode;
}

function getNextPodcastEpisode( session ) {
  let podcastEpisode = 0;

  if ( "attributes" in session && "currentPodcastEpisode" in session.attributes ) {
    podcastEpisode = parseInt( session.attributes.currentPodcastEpisode, 10 ) + 1;
  }

  return podcastEpisode;
}

function playPodcast ( request, session, callback ) {

    const podcastEpisode = getPodcastEpisode( session );

    getLatestPodcastUrl( podcastEpisode ).then( ( podcastUrl ) => {

      callback( null, {
        "version": "1.0",
        "response": {
          "speechletResponse": {
            "directives": [
              {
                "playBehavior": "REPLACE_ALL",
                "audioItem": {
                  "stream": {
                    "token": "0",
                    "url": podcastUrl,
                    "offsetInMilliseconds": 0
                  }
                }
              }
            ],
            "shouldEndSession": false
          }
        },
        "sessionAttributes": {
          "currentPodcastEpisode": podcastEpisode,
          "STATE": "PLAY",
          "offsetInMilliseconds": 0,
          "playbackFinished": false,
          "token": "0"
        }
      });
    }).catch( console.log );
}

function stopPodcast ( request, session, callback ) {

    let sessionAttributes = session.attributes;
    sessionAttributes.STATE = "STOP";

    callback( null, {
      "version": "1.0",
      "response": {
        "speechletResponse": {
          "directives": [{
            "type": "AudioPlayer.Stop"
          }],
          "shouldEndSession": false
        }
      },
      "sessionAttributes": sessionAttributes
    });
}

function endSession ( sessionEndedRequest, session, callback ) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    callback();
}

function securityCheckFails ( applicationId ) {
    const validAppId = ( applicationId === process.env.applicationId );
    if ( !validAppId ) {
        console.log( `invalid application ID: ${applicationId}` );
    }
    return !validAppId;
}

exports.handler = ( event, context, callback ) => {

  if ( securityCheckFails( event.session.application.applicationId ) ) {
      callback('Invalid Application ID');
      return;
  }

  alexaServiceRequest ( event )
      .types({
          "LaunchRequest":       introducePodcast,
          "SessionEndedRequest": endSession
      })
      .intents({
          "PlayAudio":              playPodcast,
          "help":                   introducePodcast,
          "AMAZON.NextIntent":      () => {},
          "AMAZON.PauseIntent":     () => {},
          "AMAZON.PreviousIntent":  () => {},
          "AMAZON.ResumeIntent":    () => {},
          "AMAZON.StartOverIntent": playPodcast,
          "AMAZON.StopIntent":      stopPodcast
      })
      .default( introducePodcast )
      .run( event.request, event.session, callback );

};