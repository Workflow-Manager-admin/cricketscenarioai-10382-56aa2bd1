#!/bin/bash
cd /home/kavia/workspace/code-generation/cricketscenarioai-10382-56aa2bd1/cricket_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

