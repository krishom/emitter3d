#!/bin/bash -x

urls=$(cat <<'EOF'
https://threejs.org/examples/fonts/helvetiker_regular.typeface.json
https://threejs.org/examples/textures/cube/Park3Med/px.jpg
https://threejs.org/examples/textures/cube/Park3Med/nx.jpg
https://threejs.org/examples/textures/cube/Park3Med/py.jpg
https://threejs.org/examples/textures/cube/Park3Med/ny.jpg
https://threejs.org/examples/textures/cube/Park3Med/pz.jpg
https://threejs.org/examples/textures/cube/Park3Med/nz.jpg
EOF
)

for url in $urls; do
    no_protocol="${url#*://}"
    mkdir -p dist/$(dirname $no_protocol)
	curl "$url" > dist/${no_protocol}
done
