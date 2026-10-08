I want the agentic loop that figures out how to do stuff to be run using 'ask'.

We can use deepseek v4 flash on openrouter to interpret the commands and use the cli api to call those commands.

For example, running 'ppx ask < Create a tournament to be played next month in maastricht' should start the thinking process. That should return a session id which will track further interactions about this work. Then 'ppx ask --session-id < follow up' should take care of an follow ups, etc. Just running ppx ask a the command line should be enough to have an interactice session in the terminal. This is a way to test out the agent loop. The agent should print the ppx commands it runs so I can see how well the tool is meeting it;s needs vs token churn which is one of the thinigs I'd like to avoid.
