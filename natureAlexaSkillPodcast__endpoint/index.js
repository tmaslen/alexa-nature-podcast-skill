'use strict';

const AWS = require( "aws-sdk" );

AWS.config.region = "eu-west-1";

const alexaServiceRequest = require( "../lib/alexa-service-request" );

function buildSpeechletResponse ( title, output, repromptText, shouldEndSession ) {
    return {
      "version": "1.0",
      "response": {
        "outputSpeech": {
            "type": "PlainText",
            "text": output
        },
        "card": {
            "type": "Simple",
            "title": `SessionSpeechlet - ${title}`,
            "content": `SessionSpeechlet - ${output}`
        },
        "reprompt": {
            "outputSpeech": {
                "type": "PlainText",
                "text": repromptText
            }
        },
        "shouldEndSession": shouldEndSession
      },
      "sessionAttributes": {
        "debug": "200"
      }
    }
}

function introducePodcast ( launchRequest, session, context, callback ) {

    const sessionAttributes = {};
    const cardTitle = "Welcome";
    const speechOutput = "Say play to start litening to the latest Nature podcast. Each week Nature publishes a free audio show. Every show features highlighted content from the week's edition of Nature including interviews with the people behind the science, and in-depth commentary and analysis from journalists covering science around the world.";
    const repromptText = "Want to play the podcast?";
    const shouldEndSession = true;

    const speechResponse = buildSpeechletResponse(
        cardTitle,
        speechOutput,
        repromptText,
        shouldEndSession
    );

    console.log( "****" );
    console.log( speechResponse );
    console.log( "****" );

    callback(
        null,
        speechResponse
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

function getPodcastEpisode( context ) {
  let podcastEpisode = 0;

  if ( "AudioPlayer" in context && "token" in context.AudioPlayer ) {
    podcastEpisode = parseInt( context.AudioPlayer.token, 10 ) + 1;
  }

  return podcastEpisode;
}

function playPodcast ( request, session, context, callback ) {

    const podcastEpisode = getPodcastEpisode( context );

    getLatestPodcastUrl( podcastEpisode ).then( ( podcastUrl ) => {

      const reply = {
        "version": "1.0",
        "response": {
          "directives": [{
            "type": "AudioPlayer.Play",
            "playBehavior": "REPLACE_ALL",
            "audioItem": {
              "stream": {
                "token": podcastEpisode.toString(),
                "url": podcastUrl,
                "offsetInMilliseconds": 0
              }
            }
          }],
          "shouldEndSession": true
        },
        "sessionAttributes": {
          "currentPodcastEpisode": podcastEpisode,
          "STATE": "PLAY",
          "offsetInMilliseconds": 0,
          "playbackFinished": false,
          "token": "0",
          "debug": "100"
        }
      };

      console.log( "*****" );
      console.log( JSON.stringify( reply ) );
      console.log( "*****" );

      callback( null, reply );

    }).catch( console.log );
}

function stopPodcast ( request, session, context, callback ) {

    let sessionAttributes = session.attributes || {};
    sessionAttributes.STATE = "STOP";

    const reply = {
      "version": "1.0",
      "response": {
        "directives": [{
          "type": "AudioPlayer.Stop"
        }],
        "shouldEndSession": true
      },
      "sessionAttributes": sessionAttributes
    }

    console.log( "****" );
    console.log( JSON.stringify( reply ) );
    console.log( "****" );

    callback( null, reply );
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

function noReplyNeeded ( request, session, context, callback ) {
  console.log( "replying with default object {}" );
  callback( null, {
      "version": "1.0",
      "sessionAttributes": {},
      "response": {
          "shouldEndSession": true
      }
  });
}

exports.handler = ( event, context, callback ) => {

  console.log( "*^*^*^*" );
  console.log( JSON.stringify( event ) );
  console.log( "*^*^*^*" );

  if ( securityCheckFails( event.context.System.application.applicationId ) ) {
      callback('Invalid Application ID');
      return;
  }

  alexaServiceRequest ( event )
      .types({
          "LaunchRequest":       introducePodcast,
          "SessionEndedRequest": endSession,
          "AudioPlayer.PlaybackStarted": noReplyNeeded,
          "AudioPlayer.PlaybackStopped": noReplyNeeded,
          "System.ExceptionEncountered": noReplyNeeded
      })
      .intents({
          "PlayAudio":              playPodcast,
          "StopAudio":              stopPodcast,
          "help":                   introducePodcast,
          "AMAZON.NextIntent":      playPodcast,
          "AMAZON.PauseIntent":     stopPodcast,
          "AMAZON.PreviousIntent":  noReplyNeeded,
          "AMAZON.ResumeIntent":    noReplyNeeded,
          "AMAZON.StartOverIntent": playPodcast,
          "AMAZON.StopIntent":      stopPodcast
      })
      .default( introducePodcast )
      .run( event.request, event.session, event.context, callback );

};