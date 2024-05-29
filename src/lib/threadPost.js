import { makeSurveyPost } from "./makeSurveyPost.js";

export const threadPost = async (client, redisClient, surveyName) => {
   
    const channelId = '1245319554201157724'
    console.log("posting", surveyName, "to", channelId);

    const messagesToSend = await makeSurveyPost(redisClient, surveyName);
    const channel = await client.channels.fetch(channelId);

    for (const [i, toSend] of Object.entries(messagesToSend)) {
        if (i == 0) {
            await channel.threads.create({
                name: surveyName,
                message: toSend
            });
        } else {
            await channel.threads.create({
                name: surveyName,
                message: toSend
            });
        }
    }
};
