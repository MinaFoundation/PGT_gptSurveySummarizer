import log from "../logger.js";

const getGuildMembers = async (guild) => {
    try {
        if (!guild) {
            throw new Error('Guild not found.');
        }

        const members = await guild.members.fetch();
        return members.map(member => ({ username: member.user.username, id: member.user.id }));
    } catch (e) {
        log.error(`An error occurred while fetching members: ${e}`);
    }
};