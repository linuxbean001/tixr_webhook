
const express = require("express")
const router = express.Router();

const { getNashvilleUser} = require('../controller/nashvillService');
const {getColumbusUser} = require('../controller/columbusServices');
const {getCincinnatiUser} = require('../controller/cincinnatiService')


router.get("/getNashvilleUser", getNashvilleUser);
router.get("/getColumbus", getColumbusUser);
router.get("/getCincinnatiUser", getCincinnatiUser);


module.exports = router;
