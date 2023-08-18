
const express = require("express")
const router = express.Router();

const { getNashvilleUser} = require('../services/nashvillService')
const {getColumbusUser} = require('../services/columbusServices')
const {getHashkey} = require('../services/nashvillService')


router.get("/getNashvilleUser", getNashvilleUser);
router.get("/getColumbus", getColumbusUser);


module.exports = router;
