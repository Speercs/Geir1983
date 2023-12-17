'use strict'
module.exports = function(grunt) {
    let config = require('./.screeps.json')
    let branch = grunt.option('branch') || config.branch;
    let email = grunt.option('email') || config.email;
    let password = grunt.option('password') || config.password;
    let mmoPassword = grunt.option('mmoPassword') || config.mmoPassword;
    let mmoToken = grunt.option('mmoToken') || config.mmoToken;
    
    let ptr = grunt.option('ptr') ? true : config.ptr
    

    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
        screeps: {
            options: {
                server: {
                    host: 'screeps.com',
                    port: 443,
                    http: false
                },                
                email: email,
                password: password,
                branch: branch,
                ptr: ptr
            },
            dist: {
                src: ['*.js']
            },

            season: {
                options: {
                    branch: 'default',
                    server: 'season',
                    email: email,
                    token: mmoToken,
                },
                src: ['*.js'],
            },

            ptr: {
                options: {
                    server: 'ptr',
                },
                src: ['*.js'],
            },

            mmo: {
                options: {
                    server: 'persistent',
                    password: mmoPassword,
                },
                src: ['*.js'],
            },


            s1: {
                options: {
                    server: {
                            host: 'server1.screepspl.us',
                            port: 443,
                            http: false
                    },
                },
                src: ['*.js'],
            },
            s2: {
                options: {
                    server: {
                            host: 'server2.screepspl.us',
                            port: 443,
                            http: false
                    },
                },
                src: ['*.js'],                
            }, 
            sTest: {
                options: {
                    server: {
                            host: 'geir1983.hosting.screepspl.us',
                            port: 443,
                            http: false
                    },
                },
                src: ['*.js'],                
            }, 
            local: {
                options: {
                    server: {
                            host: '127.0.0.1',
                            port: 21025,
                            http: true
                    },
                },
                src: ['*.js'],
            },   
            local2: {
                options: {
                    server: {
                            host: '127.0.0.1',
                            port: 21025,
                            http: true
                    },
                    email: 'geirgrodal-2@hotmail.com'
                },
                src: ['*.js'],
            }, 
            
            
            swc: {
                options: {
                    server: {
                            host: 'swc.screepspl.us',
                            port: 443,
                            http: false
                    },
                },
                src: ['*.js'],
            },
            bot: {
                options: {
                    server: {
                            host: 'direct.botarena.screepspl.us',
                            port: 21025,
                        //    host: 'botarena.screepspl.us',
                        //    port: 443,
                        //      http: false
                            http: true
                    },
                },
                src: ['*.js'],
            },
        }
    });
    grunt.registerTask('mmo',  ['screeps:mmo']);
    grunt.registerTask('season',  ['screeps:season']);
    grunt.registerTask('s+',  ['screeps:s1', 'screeps:s2']);
    grunt.registerTask('s1',  ['screeps:s1']);
    grunt.registerTask('s2',  ['screeps:s2']);   
    grunt.registerTask('sTest',  ['screeps:sTest']);   
    grunt.registerTask('swc',  ['screeps:swc']);
    grunt.registerTask('bot',  ['screeps:bot']);
    grunt.registerTask('eco',  ['screeps:eco']);
    grunt.registerTask('ptr',  ['screeps:ptr']);
    grunt.registerTask('local',  ['screeps:local']);    
    grunt.registerTask('local2',  ['screeps:local2']);    
    grunt.registerTask('all',  ['screeps:s2', 'screeps:s1', 'screeps:bot', 'screeps:swc']);
}

