const userChannels = require('./userChannels');

const USER_CHANNEL_JIDS = Array.isArray(userChannels) ? userChannels : [];

function getUserChannelJids() {
    return USER_CHANNEL_JIDS;
}

module.exports = { getUserChannelJids };