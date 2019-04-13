let request = require('request');
let validate = require("validate.js");

//
//  Load the API Key only once
//
let MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
let MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;

//
//  This end point is responsabile for subscribing a user to the mailing list
//
exports.handler = (event, context, callback) => {

	//
	//	1.	COnvert the obdy in to a JS object
	//
	let body = JSON.parse(event.body);

	//
	//	2.	Create a container that will be passed around the chain
	//
	let container = {
	    list_id: MAILCHIMP_LIST_ID,
		email: body.email
	};

	//
	//	3.	Start the chain
	//
	check_for_the_mail(container)
		.then(function(container) {

	        return subscribe_the_email(container);

		}).then(function(container) {

	        return make_the_response(container);

		}).then(function(container) {

			callback(null, container.response);

		}).catch(function(error) {

            //
            //  1.  Create a message to send back
            //
            let message = {
                message: error
            };

			//
			//  2.  Create the response
			//
			let response = {
				statusCode: error.status,
				body: JSON.stringify(message, null, 4)
			};

			//
			//  ->  Tell lambda that we finished
			//
			callback(null, response);

		});

};

//	 _____   _____    ____   __  __  _____   _____  ______   _____
//	|  __ \ |  __ \  / __ \ |  \/  ||_   _| / ____||  ____| / ____|
//	| |__) || |__) || |  | || \  / |  | |  | (___  | |__   | (___
//	|  ___/ |  _  / | |  | || |\/| |  | |   \___ \ |  __|   \___ \
//	| |     | | \ \ | |__| || |  | | _| |_  ____) || |____  ____) |
//	|_|     |_|  \_\ \____/ |_|  |_||_____||_____/ |______||_____/
//

//
//	Make sure the user entered all the data, and the data is valid
//
function check_for_the_mail(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Check if the data conforms
		//
		let result = validate(container, constraints);

		//
		//	2.	Check if Validate found some issues
		//
		if(result)
		{
			//
			//	1.	Set the status message to help understand what happened in
			//		programmatically way.
			//
			result.status = 400;

			//
			//	->	Stop and pass the error forward
			//
			return reject(result);
		}

		//
		//	->	Move to the next chain
		//
		return resolve(container);

	});
}

//
//	Use the email tht was passed to subscribe the user to the mailing list
//
function subscribe_the_email(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Prepare the request
		//
		let options = {
			url: 'https://us17.api.mailchimp.com/3.0/lists/' + container.list_id,
			json: true,
			auth: {
			    user: '',
			    pass: MAILCHIMP_API_KEY
			},
			body: {
			    members: [{
    			    email_address: container.email,
    				status: "subscribed"
			    }],
			    "update_existing": false
			}
		};

		//
		//	2.	Make the request
		//
		request.post(options, function(error, response, body) {

			//
			//	1. Make sure there was no error from the other side
			//
			if(error)
			{
				return reject(error);
			}

            //
			//	2.	Throw an error if the response is not positive.
			//
			if(response.statusCode > 200)
			{
				//
				//	1. 	Set the error name based on the title that Mailchimp
				//		sent us.
				//
				let error = new Error(body.title);

				//
				//	2.	Set the error status from Mailchimp
				//
				error.status = body.status;

				//
				//	->	Stop the chain and jump to the error handling
				//
				return reject(error);
			}

			//
			//	->	Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	AWS Lamdas responses are much more complicted and require more data to
//	produce a response that just works. Hend putting it all in one place.
//
function make_the_response(container)
{
	return new Promise(function(resolve, reject) {

        //
		//  1.  Create a positive message
		//
		container.response = {
			statusCode: 200,
			headers: {
		        "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
		        "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
	    	},
			body: JSON.stringify({
	            message: "Saved"
	        }, null, 4)

		};

		//
		//	->	Move to the next chain
		//
		return resolve(container);

	});
}


//  _    _   ______   _        _____    ______   _____     _____
// | |  | | |  ____| | |      |  __ \  |  ____| |  __ \   / ____|
// | |__| | | |__    | |      | |__) | | |__    | |__) | | (___
// |  __  | |  __|   | |      |  ___/  |  __|   |  _  /   \___ \
// | |  | | | |____  | |____  | |      | |____  | | \ \   ____) |
// |_|  |_| |______| |______| |_|      |______| |_|  \_\ |_____/
//

//
//	Constrains to check against
//
let constraints = {
	email: {
		email: {
			message: "doesn't look like a valid email"
		}
	}
};