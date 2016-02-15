module.exports = {
    "port": 9000,
    "mock": false, // default false
    "react": false, // use react
    "webpack": {
        "output": {
            "*.html": {}
        },
        "commonTrunk": {},
        "global": {},
        "devServer": {
            "proxy": {
                "/test_/?*": "please change or remove this as you need"
            }
        }
    },
    "copy": []
}
