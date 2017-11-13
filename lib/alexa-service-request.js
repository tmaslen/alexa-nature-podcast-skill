module.exports = function alexaServiceRequest( event ) {
    let typesRegistry = {};
    let intentsRegistry = {};
    let defaultRegistry = null;
    const type = event.request.type;
    const intent = ( event.request.intent ) ? event.request.intent.name : {};

    const alexaServiceRequestChain = {
        "run": function () {
            const params = Array.prototype.slice.call( arguments );
            if ( type in typesRegistry ) {
                console.log( `Type - ${type}` );
                typesRegistry[ type ].apply( this, params );
            } else if ( intent in intentsRegistry ) {
                console.log( `Intent - ${intent}` );
                intentsRegistry[ intent ].apply( this, params );
            } else if ( defaultRegistry ) {
                console.log( `running the default command` );
                defaultRegistry.apply( this, params );
            }
            typesRegistry = {};
            intentsRegistry = {};
            defaultRegistry = null;
            return null;
        },
        "types": function ( types ) {
            Object.keys( types ).forEach( ( key ) => {
                typesRegistry[ key ] = types[ key ];
            });
            return alexaServiceRequestChain;
        },
        "intents": function ( intents ) {
            Object.keys( intents ).forEach( ( key ) => {
                intentsRegistry[ key ] = intents[ key ];
            });
            return alexaServiceRequestChain;
        },
        "default": function ( d ) {
            defaultRegistry = d;
            return alexaServiceRequestChain;
        }
    }
    return alexaServiceRequestChain;
}