'use strict';

const express = require('express');
const router = express.Router();

const routers = require('../../controllers/client/routerController');

router.get('/', routers.list);
router.post('/', routers.create);
router.get('/:id', routers.getOne);
router.patch('/:id', routers.update);
router.delete('/:id', routers.remove);
router.post('/:id/test', routers.test);
router.get('/:id/sessions', routers.activeSessions);

module.exports = router;