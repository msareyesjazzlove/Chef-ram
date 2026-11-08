import numpy as np, wave
sr=44100; D=90; t=np.arange(D*sr)/sr
def sm(a,b,x): u=np.clip((x-a)/(b-a),0,1); return u*u*(3-2*u)
rng=np.random.default_rng(1)
out=np.zeros_like(t)
# chord pad, 2 bars per chord (~5s each), I-vi-IV-V in C
f=lambda n:440*2**((n-69)/12)
chords=[[48,60,64,67],[45,57,60,64],[41,57,60,65],[43,55,59,62]]
seg=5.0
for i in range(int(D/seg)+1):
    ch=chords[i%4]; s0=i*seg
    idx=(t>=s0)&(t<s0+seg+1.5); tt=t[idx]-s0
    env=np.minimum(tt/1.2,1)*np.exp(-np.maximum(tt-seg,0)*3)
    for n in ch:
        out[idx]+=0.05*env*(np.sin(2*np.pi*f(n)*tt)+0.3*np.sin(2*np.pi*f(n)*1.003*tt)+0.15*np.sin(2*np.pi*f(n)*2*tt))
# music-box melody (pentatonic), brighter in Christmas + intro/outro
mel=[72,74,76,79,81,79,76,74,72,76,79,84,81,79,76,72]
beat=0.625
for k in range(int(D/beat)):
    s0=k*beat; n=mel[k%len(mel)]
    if k%2 and rng.random()<0.4: continue
    idx=(t>=s0)&(t<s0+1.6); tt=t[idx]-s0
    amp=0.07*np.exp(-tt*3.5)
    out[idx]+=amp*(np.sin(2*np.pi*f(n)*tt)+0.4*np.sin(2*np.pi*f(n)*3*tt)*np.exp(-tt*8))
# sleigh-ish bells during Christmas (68-80)
for s0 in np.arange(68.5,79.5,0.3125):
    idx=(t>=s0)&(t<s0+0.25); tt=t[idx]-s0
    out[idx]+=0.025*np.exp(-tt*25)*rng.standard_normal(idx.sum())*np.sin(2*np.pi*6000*tt)
# wind: filtered noise, follows snowfall
noise=rng.standard_normal(len(t))
k=np.ones(400)/400; wind=np.convolve(noise,k,'same')*8
gust=0.6+0.4*np.sin(2*np.pi*t/7)*np.sin(2*np.pi*t/3.3)
snow=sm(10,16,t)*(1-sm(79,84,t))
out+=wind*0.12*gust*snow*(1-0.5*sm(68,69,t)*(1-sm(79.5,80.5,t)))
# ocean waves at start/end
waves=np.convolve(noise,np.ones(60)/60,'same')*3*(0.5+0.5*np.sin(2*np.pi*t/4))
out+=waves*0.05*(1-sm(10,18,t)+sm(82,86,t))
# fades
out*=sm(0,1.5,t)*(1-sm(87.5,90,t))
out=out/np.max(np.abs(out))*0.85
st=np.stack([out,np.roll(out,200)],1)
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
