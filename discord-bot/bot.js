require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { createClient } = require('redis');
const openai = require('openai');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect();

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
            await redisClient.rPush(`survey:${surveyName}:responses`, response);
            await interaction.reply(`Response to ${surveyName} recorded.`);
            break;
        case 'summary':
            const responses = await redisClient.lRange(`survey:${surveyName}:responses`, 0, -1);
            // Placeholder for OpenAI integration - replace with actual API call
            const summary = responses.join(' '); // Simplification: Summarize responses
            await interaction.reply(`Summary for ${surveyName}: ${summary}`);
            break;
    }
});

client.login(process.env.DISCORD_TOKEN);

