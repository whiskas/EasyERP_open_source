var mongoose = require('mongoose');
var journalSchema = mongoose.Schemas['journal'];
var journalEntrySchema = mongoose.Schemas['journalEntry'];

var oxr = require('open-exchange-rates');
var fx = require('money');
var _ = require('underscore');
var async = require('async');
var moment = require('../public/js/libs/moment/moment');

var Module = function (models) {
    "use strict";
    //ToDo set it to process.env
    oxr.set({ app_id: 'b81387a200c2463e9ae3d31cc60eda62' });

    this.create = function (body, cb) {
        var Journal = models.get(req.session.lastDb, 'journal', journalSchema);
        var Model = models.get(req.session.lastDb, 'journalEntry', journalEntrySchema);
        var journalId = body.journal;
        var now = moment();
        var date = body.date ? moment(body.date) : now;
        var currency = {
            name: body.currency
        };
        var rates;

        var waterfallTasks = [journalFinder, journalEntrySave];

        date = date.format('YYYY-MM-DD');

        function journalFinder(waterfallCb){
            var err;

            if(!journalId){
                err = new Error('Journal id is required field');
                err.status = 400;

                return waterfallCb(err);
            }

            Journal.findById(journalId, waterfallCb);

        };

        function journalEntrySave(journal, waterfallCb){
            oxr.historical(date, function() {
                var journalEntry;
                var err;

                if(!journal || !journal._id){
                    err = new Error('Invalid Journal');
                    err.status = 400;

                    return waterfallCb(err);
                }

                rates = oxr.rates;
                currency.rate = rates[body.currency];

                body.currency = currency;
                body.journal = journal._id;

                journalEntry = new Model(body);
                journalEntry.save(waterfallCb);
            });
        };

        async.waterfall(waterfallTasks, function(err, response){
            if(err){
                return cb(err);
            }

            cb(null, response);
        });
    };

    this.getForView = function (req, res, next) {
        var Model = models.get(req.session.lastDb, 'journalEntry', journalEntrySchema);

        var data = req.query;
        var sort = data.sort ? data.sort : {_id: 1};

        access.getReadAccess(req, req.session.uId, 85, function (access) {
            if (access) {
                Model
                    .find({})
                    .sort(sort)
                    .exec(function (err, result) {
                        if (err) {
                            return next(err);
                        }

                        res.status(200).send(result);
                    });
            } else {
                res.status(403).send();
            }
        });
    };
};

module.exports = Module;
