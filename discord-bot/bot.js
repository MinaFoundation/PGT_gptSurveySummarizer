require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { createClient } = require('redis');
const openai = require('openai');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect(); // TODO maybe put this in an async function and block til ready

client.once('ready', () => {
    console.log('Ready!');
});

const commands = [
    new SlashCommandBuilder().setName('createsurvey').setDescription('Create a new survey')
        .addStringOption(option => option.setName('name').setDescription('The name of the survey').setRequired(true)),
    new SlashCommandBuilder().setName('listsurveys').setDescription('List all available surveys'),
    new SlashCommandBuilder().setName('respond').setDescription('Respond to a survey')
        .addStringOption(option => option.setName('name').setDescription('The name of the survey').setRequired(true))
        .addStringOption(option => option.setName('response').setDescription('Your response').setRequired(true)),
    new SlashCommandBuilder().setName('summary').setDescription('Get the summary of a survey')
        .addStringOption(option => option.setName('name').setDescription('The name of the survey').setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('Successfully registered commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;
    const surveyName = options.getString('name');

    switch (commandName) {
        case 'createsurvey':
            await redisClient.sAdd('surveys', surveyName);
            await interaction.reply(`Survey ${surveyName} created.`);
            break;
        case 'listsurveys':
            const surveys = await redisClient.sMembers('surveys');
            await interaction.reply(`Available surveys: ${surveys.join(', ')}`);
            break;
        case 'respond':
            const response = options.getString('response');
            // TODO make this a map with the discord name so users can update their previous responses
            await redisClient.rPush(`survey:${surveyName}:responses`, response);
            await interaction.reply(`Response to ${surveyName} recorded.`);
            await redisClient.publish('survey-refresh', surveyName);
            break;
        case 'summary':
            // TODO make this work even before the first survey refresh
            const summaryJSON = await redisClient.get('survey:${surveyName}:summary');
            // TODO format this
            await interaction.reply(`Summary for ${surveyName}: ${summaryJSON}`);
            break;
    }
});

client.login(process.env.DISCORD_TOKEN);

