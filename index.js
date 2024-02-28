const port = 3000;
const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const db = require('./db.js')
const mysql = require('mysql');
const { isUndefined } = require('util');
const client = require('twilio')('AC88f8c17e31e4c083f9b5a2e1c3a19eb1', '9c88e5ea40322ecb9ca1d3810b669035');
const twilioKey = 'QJLBRCPZFB1KG2WYZERPY6T2'
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');


app.use(express.json()); // Add this line to parse JSON requests
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', './views');




const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');


async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}


async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}


async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}




// inserrting data into google sheets
async function insertDataIntoGoogleSheets(data) {
    try {

        const spreadsheetId = '1vmqgc7acLZgBxCuSjpZbYshf9_7pPPpG71wUTGz5BL8';
        // Your authentication and setup for Google Sheets API should already be done here
        const auth = await authorize();

        // Fetch the spreadsheet and specific sheet you want to work with
        const sheets = google.sheets({ version: 'v4', auth });
        const sheetName = 'Sheet1';

        // Retrieve the values from the Google Sheets document
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:Z`, // Assuming data is within columns A to Z, starting from row 1
        });

        console.log("Response:", response);

        console.log("Response data is: ", response.data, "response value is: ", response.data.values, "response value length is: ", response.data.values.length);

        // Find the index of the last row with any non-empty cell
        let insertRowIndex = 0;
        const numRows = response.data.values ? response.data.values.length : 0;
        const numCols = response.data.values && response.data.values[0] ? response.data.values[0].length : 0;

        console.log("Num rows and columns:", numRows, numCols);


        insertRowIndex = numRows + 1;

        console.log("Insert row index:", insertRowIndex);

        // Prepare the data for insertion into a single row with multiple columns
        const rowData = Object.values(data);

        // Construct the range for the insertion
        const range = `${sheetName}!A${insertRowIndex}`;

        // Insert the data into the sheet
        const result = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });

        if (result.status === 200) {
            console.log(`Data inserted successfully at row ${insertRowIndex}.`);
        } else {
            console.error("Error inserting data: Unexpected response from Google Sheets API.");
        }

    }
    catch (err) {
        console.log("errror is:", err);
    }
}

async function mainData() {
    // console.log("enteredby");
    try {
        let query1 = "SELECT * FROM atlan.`user_responses` WHERE sheet_integration = ?";
        let result1 = await db.commonQuery(query1, [0]);
        console.log(result1);
        // console.log(result1.length, typeof (result1.length));

        if (result1.length > 0) {
            console.log("sheet integration 0 responses found");

            // let { title, description } = result1[0];
            // let responseDataString = Object.entries(responseData)
            //     .map(([key, value]) => `${key}: ${value}`)
            //     .join(', ');

            // let data = {
            //     formid: formId ?? null,
            //     formTitle: title ?? null,
            //     description: description ?? null,
            //     responseId: result1[i].id ?? null,
            //     Responses: responseDataString ?? null,
            //     validation: status ?? null,
            // }
            // console.log("data is:", data);

            for (let i = 0; i < result1.length; i++) {

                let { response_id, form_id, responseData, validation_status } = result1[i];

                let query2 = "SELECT * FROM atlan.`user_forms` WHERE form_id = ?";
                let result2 = await db.commonQuery(query2, [form_id]);
                console.log("result 2 length is: ", result2.length);

                if (result2.length > 0) {

                    let { title, description } = result2[0];

                    let responseDataString = Object.entries(responseData)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');

                    let data = {
                        formid: form_id ?? null,
                        formTitle: title ?? null,
                        description: description ?? null,
                        responseId: response_id ?? null,
                        Responses: responseDataString ?? null,
                        validation: validation_status ?? null,
                    }
                    console.log("data is:", data);

                    await insertDataIntoGoogleSheets(data);

                    let query3 = "UPDATE atlan.`user_responses` SET sheet_integration = ? WHERE response_id = ? AND form_id = ? AND sheet_integration = ?";
                    let result3 = await db.commonQuery(query3, [1, response_id, form_id, 0]);

                    if (result3.affectedRows > 0) {
                        console.log("sheet integration set to 1");
                    }
                }

            }
        }
    }
    catch (err) {
        console.log("errrror is: ", err);
    }
}




// twilio service code - QJLBRCPZFB1KG2WYZERPY6T2
// twilio phone no- +16812010021
async function smsUser(responseData) {

    try {
        
        client.messages
            .create({
                body: JSON.stringify(responseData),
                from: '+16812010021',
                to: '+919463557132'
            })
            .then(message => {
                console.log(message.sid);
            })
            .catch(error => {
                console.error('Error sending SMS:', error);
            })
            .finally(() => {
                return
            });

    } catch (err) {
        console.log(err);
        return;
    }

}



async function validateStudentData(responseData) {
    try {
        let cgpa = parseFloat(responseData.cgpa);
        let semester = parseFloat(responseData.semester);
        let branch = responseData.branch;

        console.log("cgpa, smester and branch is: ", cgpa, semester, branch);

        if (cgpa > 10.0) {
            return {
                isValid: false,
                errorMessage: 'CGPA cannot be greater than 10'
            };
        }
        if (semester > 8.0) {
            return {
                isValid: false,
                errorMessage: 'semester cannot be greater than 8'
            };
        }
        if (branch != 'CSE' && branch != 'ECE') {
            return {
                isValid: false,
                errorMessage: 'branch not available'
            };
        }

        return { isValid: true };

    }
    catch (err) {
        console.log("error is: ", err);
    }
}


async function validateEmployerData(responseData) {
    try {
        let monthlyIncome = parseFloat(responseData.monthlyIncome);
        let monthlySavings = parseFloat(responseData.monthlySavings);

        if (monthlySavings > monthlyIncome) {
            return {
                isValid: false,
                errorMessage: 'Monthly savings cannot exceed monthly income'
            };
        }

        return { isValid: true };
    }
    catch (err) {
        console.log("error is: ", err);
    }
}

// Validate response data against business rules
async function validateResponse(responseData, formType) {
    console.log("form type received is: ", formType);
    switch (formType) {
        case 'College Students':
            // Apply specific validation rules for monthly report form
            console.log("enetered student case");
            return validateStudentData(responseData);

        case 'Employer Detail':
            // Apply specific validation rules for contact form
            console.log("entered employer case");
            return validateEmployerData(responseData);

        // Add cases for other form types as needed

        default:
            // Default validation (no specific rules)
            return { isValid: true };
    }
}





// apis


app.post('/forms', async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title) {
            return res.status(400).send({ status: 0, code: 400, data: "title is missing" });
        }
        if (!description) {
            return res.status(400).send({ status: 0, code: 400, data: "description is missing" });
        }

        let createFormQuery = "INSERT INTO atlan.`user_forms`(title, description) VALUES (?, ?)";
        let createFormResult = await db.commonQuery(createFormQuery, [title, description]);

        if (createFormResult.affectedRows > 0) {
            return res.status(201).send({ status: 1, code: 200, message: "form created" });
        }
        else {
            return res.status(400).send({ status: 0, code: 400, error: "error createing form" });
        }
    }
    catch (err) {
        console.log("error is: ", err);
        return res.status(500).send({ status: 0, code: 500, data: err });
    }

})


app.get('/forms/:formId', async (req, res) => {
    try {
        const formId = req.params.formId;

        if (!formId) {
            return res.status(400).send({ status: 0, code: 400, data: "form id is missing" });
        }

        let query1 = "SELECT * FROM atlan.`user_forms` WHERE form_id = ?";
        let result1 = await db.commonQuery(query1, [formId]);

        if (result1.length === 0) {
            res.status(404).json({ error: 'Form not found' });
            return;
        }
        res.status(200).json({ form: result1[0] });

    }
    catch (err) {
        console.log("error is: ", err);
        return res.status(500).send({ status: 0, code: 500, data: err });
    }
})


app.post('/forms/:formId/questions', async (req, res) => {
    try {
        const formId = req.params.formId;
        const { text, type } = req.body;

        if (!formId) {
            return res.status(400).send({ status: 0, code: 400, data: "form id is missing" });
        }
        if (!text) {
            return res.status(400).send({ status: 0, code: 400, data: "text is missing" });
        }
        if (!type) {
            return res.status(400).send({ status: 0, code: 400, data: "type is missing" });
        }

        // Check if the form exists in the database
        let formExistsQuery = 'SELECT * FROM atlan.`user_forms` WHERE form_id = ?';
        let formExistsResult = await db.commonQuery(formExistsQuery, [formId]);

        if (formExistsResult.length === 0) {
            return res.status(404).send({ status: 0, code: 404, data: "form not found" });
        }

        let insertQuestionQuery = 'INSERT INTO atlan.`user_questions` (form_id, text, type) VALUES (?, ?, ?)';
        let insertQuestionResult = await db.commonQuery(insertQuestionQuery, [formId, text, type]);

        if (insertQuestionResult.affectedRows > 0) {
            return res.status(201).send({ status: 1, code: 200, message: "Question added to the form successfully" });
        }
        else {
            return res.status(400).send({ status: 0, code: 400, error: "Error adding question to the form" });
        }

    }
    catch (err) {
        console.log("error is: ", err);
        return res.status(500).send({ status: 0, code: 500, data: err });
    }
})


app.get('/forms/:formId/questions', async (req, res) => {
    try {
        const formId = req.params.formId;

        if (!formId) {
            return res.status(400).send({ status: 0, code: 400, data: "form id is missing" });
        }

        // Check if the form exists in the database
        let formExistsQuery = 'SELECT * FROM atlan.`user_forms` WHERE form_id = ?';
        let formExistsResult = await db.commonQuery(formExistsQuery, [formId]);

        if (formExistsResult.length === 0) {
            return res.status(404).send({ status: 0, code: 404, data: "form not found" });
        }

        let retrieveQuestionsQuery = 'SELECT * FROM atlan.`user_questions` WHERE form_id = ?';
        let retrieveQuestionsResult = await db.commonQuery(retrieveQuestionsQuery, [formId]);

        if (retrieveQuestionsResult.length > 0) {
            const questions = retrieveQuestionsResult; // Assuming questions retrieved successfully
            return res.status(200).send({ status: 1, code: 200, data: questions });
        }
        else {
            return res.status(400).send({ status: 0, code: 400, error: "Error retrieving questions" });
        }

    }
    catch (err) {
        console.log("error is: ", err);
        return res.status(500).send({ status: 0, code: 500, data: err });
    }
});


app.post('/forms/:formId/responses', async (req, res) => {
    try {
        const formId = req.params.formId;
        const responseData = req.body;

        if (!formId) {
            return res.status(400).send({ status: 0, code: 400, data: "form id is missing" });
        }
        if (!responseData) {
            return res.status(400).send({ status: 0, code: 400, data: "response data is missing" });
        }
        console.log("responseData is: ", responseData);

        // Check if the form exists in the database
        let formExistsQuery = 'SELECT * FROM atlan.`user_forms` WHERE form_id = ?';
        let formExistsResult = await db.commonQuery(formExistsQuery, [formId]);

        if (formExistsResult.length === 0) {
            return res.status(404).send({ status: 0, code: 404, data: "form not found" });
        }

        // sms to user
        await smsUser(responseData);
        console.log("sms sent");


        // check for validation
        let status = 'success';
        let validation = await validateResponse(responseData, formExistsResult[0].title);
        if (!validation.isValid) {
            status = 'failed';
            console.log("validation is: ", validation);
        }


        // insert into response db
        let insertResponseQuery = 'INSERT INTO atlan.`user_responses` (form_id, responseData, validation_status) VALUES (?, ?, ?)';
        let insertResponseResult = await db.commonQuery(insertResponseQuery, [formId, JSON.stringify(responseData), status]);

        if (insertResponseResult.affectedRows > 0) {
            await mainData();
            console.log("data is inserted in sheet");
            return res.status(201).send({ status: 1, code: 200, message: "Response added successfully" });
        }
        else {
            return res.status(400).send({ status: 0, code: 400, error: "Error adding response" });
        }


    }
    catch (err) {
        console.log("error is: ", err);
        return res.status(500).send({ status: 0, code: 500, data: err });
    }
})


app.get('/forms/:formId/responses/:responseId', async (req, res) => {
    try {
        const formId = req.params.formId;
        const responseId = req.params.responseId;

        if (!formId) {
            return res.status(400).send({ status: 0, code: 400, data: "form id is missing" });
        }
        if (!responseId) {
            return res.status(400).send({ status: 0, code: 400, data: "response id is missing" });
        }

        // Check if the response exists in the database
        let responseExistsQuery = 'SELECT * FROM atlan.`user_responses` WHERE form_id = ? AND response_id = ?';
        let responseExistsResult = await db.commonQuery(responseExistsQuery, [formId, responseId]);

        if (responseExistsResult.length === 0) {
            return res.status(404).send({ status: 0, code: 404, data: "Response not found" });
        }

        return res.status(200).send({ status: 1, code: 200, data: responseExistsResult });

    }
    catch (err) {
        console.log("error is: ", err);
        return res.status(500).send({ status: 0, code: 500, data: err });
    }
})


app.post('/forms/:formId/responses/:responseId/answers', async (req, res) => {
    try {
        const formId = req.params.formId;
        const responseId = req.params.responseId;
        const { questionId, answer } = req.body;

        if (!formId) {
            return res.status(400).send({ status: 0, code: 400, data: "form id is missing" });
        }
        if (!responseId) {
            return res.status(400).send({ status: 0, code: 400, data: "response id is missing" });
        }
        if (!questionId) {
            return res.status(400).send({ status: 0, code: 400, data: "question id is missing" });
        }
        if (!answer) {
            return res.status(400).send({ status: 0, code: 400, data: "answer is missing" });
        }

        // Check if the response exists in the database
        let responseExistsQuery = 'SELECT * FROM atlan.`user_responses` WHERE form_id = ? AND response_id = ?';
        let responseExistsResult = await db.commonQuery(responseExistsQuery, [formId, responseId]);

        if (responseExistsResult.length === 0) {
            return res.status(404).send({ status: 0, code: 404, data: "Response not found" });
        }

        let insertAnswerQuery = 'INSERT INTO atlan.`user_answers` (response_id, question_id, text) VALUES (?, ?, ?)';
        let insertAnswerResult = await db.commonQuery(insertAnswerQuery, [responseId, questionId, answer]);

        if (insertAnswerResult.affectedRows > 0) {
            return res.status(201).send({ status: 1, code: 200, message: "Answer added successfully" });
        }
        else {
            return res.status(400).send({ status: 0, code: 400, error: "Error adding answer" });
        }

    }
    catch (err) {
        console.log("error is: ", err);
        return res.status(500).send({ status: 0, code: 500, data: err });
    }
})


app.get('/forms/:formId/responses/:responseId/answers', async (req, res) => {
    try {
        const formId = req.params.formId;
        const responseId = req.params.responseId;

        if (!formId) {
            return res.status(400).send({ status: 0, code: 400, data: "form id is missing" });
        }
        if (!responseId) {
            return res.status(400).send({ status: 0, code: 400, data: "response id is missing" });
        }

        // Check if the response exists in the database
        let responseExistsQuery = 'SELECT * FROM atlan.`user_responses` WHERE form_id = ? AND response_id = ?';
        let responseExistsResult = await db.commonQuery(responseExistsQuery, [formId, responseId]);

        if (responseExistsResult.length === 0) {
            return res.status(404).send({ status: 0, code: 404, data: "Response not found" });
        }

        let retrieveAnswersQuery = 'SELECT * FROM atlan.`user_answers` WHERE response_id = ?';
        let retrieveAnswersResult = await db.commonQuery(retrieveAnswersQuery, [responseId]);

        if(retrieveAnswersResult.length === 0){
            return res.status(404).send({ status: 0, code: 404, data: "answer not found" });
        }

        return res.status(200).send({ status: 1, code: 200, data: retrieveAnswersResult });

    }
    catch (err) {
        console.log("error is: ", err);
        return res.status(500).send({ status: 0, code: 500, data: err });
    }
})



app.listen(port, function (err) {
    if (err) {
        console.error("Error starting the server:", err);
    } else {
        console.log("Server running at port " + port);
    }
});





