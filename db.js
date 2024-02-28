const mysql = require('mysql2');
var credentials = require('./credentials.js');
var pool = mysql.createPool(credentials);

const commonQuery = (query, paramArray) => {
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, connection) {
            if (!err) {
                connection.query(query, paramArray, function (err, results) {
                    connection.release();
                    if (!err) {
                        resolve(results);
                    } else {
                        reject(err);
                    }
                });
            } else {
                reject(err);
            }
        });
    });
}
const getConnection = () => {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err);
            } else {
                resolve(connection);
            }
        })
    })
}
const begin = (connection) => {
    return new Promise((resolve, reject) => {
        connection.beginTransaction((err) => {
            if (err) { reject(err); }
            resolve();
        })
    })
}
const transactionalQuery = (query, params_arr, connection) => {
    return new Promise((resolve, reject) => {
        connection.query(mysql.format(query, params_arr), function (err, results) {
            if (!err) {
                resolve(results);
            } else {
                reject(err);
            }
        })
    })
}
const rollback = (connection) => {
    return new Promise((resolve, reject) => {
        connection.rollback(() => {
            connection.release();
            resolve();
        });
    }).catch(function (errRoll) {
        console.log("errRoll ", errRoll);
        connection.release();
    });
}
const commit = (connection) => {
    return new Promise((resolve, reject) => {
        connection.commit(function (err) {
            connection.release();
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        })
    }).catch(function (errRoll) {
        connection.release();
    });
}
const handleQuery = (query, params, connection) => {
    return new Promise((resolve, reject) => {
        transactionalQuery(query, params, connection).then(function (results) {
            resolve(results);
        }).catch(function (err) {
            console.log("Error while fetching db ", err);
            reject([]);
        })
    })
}


module.exports = {
    commonQuery,
    getConnection,
    begin,
    transactionalQuery,
    rollback,
    commit,
    handleQuery
}