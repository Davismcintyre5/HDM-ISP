'use strict';

const express = require('express');
const router = express.Router();

const notifications = require('../../controllers/admin/notificationController');

router.get('/', notifications.list);
router.get('/unread-count', notifications.unreadCount);
router.post('/read-all', notifications.markAllRead);
router.post('/:id/read', notifications.markRead);
router.delete('/:id', notifications.remove);

module.exports = router;