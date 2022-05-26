        const http= require('http')
        const path= require('path')
        const express= require('express')
        const socketIo= require('socket.io')
        const needle = require('needle')
        const config = require('dotenv').config()
        const TOKEN =  process.env.TWITTER_BEARER_TOKEN
        const PORT= process.env.PORT || 3000
        // const searchForm=document.getElementById('search-form')
        // const searchInput=document.getElementById('search-input')

        const app= express()

        const server = http.createServer(app)
        const io = socketIo(server)

        app.get('/',(req, res)=>{
            res.sendFile(path.resolve(__dirname,'../','client','index.html'))
        })

        const rulesURL ='https://api.twitter.com/2/tweets/search/stream/rules'
        const streamURL ='https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id'
         
        // searchForm.addEventListener('submit',e=>{

        //     const searchTerm=searchInput.value;
        //     e.preventDefault()
        // });
        const rules=[{value:'code'}]

        // To get streaming rules
        async function getRules(){
            const response =await needle('get', rulesURL,{
                headers: {
                    Authorization: `Bearer ${TOKEN}`
                },
            })
            console.log(response.body)
            return response.body
        }

        // To set streaming rules
        async function setRules(){
            const data = { 
                add: rules
            }
            
            const response =await needle('post', rulesURL, data,{
                headers: {
                    'content-type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`,
                },
            })
        
            return response.body
        }
            // To delete streaming rules
            async function deleteRules(rules){

            // we have to make sure rulesdata is an array or retun null
            if(!Array.isArray(rules.data)){
                return null
            }
                const ids= rules.data.map((rule)=>rule.id)
                const data = { 
                    delete:{
                        ids:ids
                    }
                }
                
                const response =await needle('post', rulesURL, data,{
                    headers: {
                        'content-type': 'application/json',
                        Authorization: `Bearer ${TOKEN}`,
                    },
                })
            
                return response.body
            }

            function streamTweets(socket){
                const stream = needle.get(streamURL,{
                    headers:{
                        Authorization:`Bearer ${TOKEN}`,
                    },
                })
                stream.on('data',(data)=>{
                    try{
            const json=JSON.parse(data)
            //    console.log(json)
            socket.emit('tweet',json)
                    }catch(error){}
                    
                })
            }

        io.on('connection',async()=>{
            console.log('Client connected..')
            let currentRules

            try{
            // this get all the stream rules
                currentRules = await getRules()

                // this delete them this wiping it clean
                await deleteRules(currentRules)
            
                // this will set rules based on array above
                await setRules()
            } catch (error){

                console.error(error)

                process.exit(1)

            }
            streamTweets(io)
        })
        
            server.listen(PORT,()=> console.log(`Listening on port ${PORT}`))