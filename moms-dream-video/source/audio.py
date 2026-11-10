import numpy as np, wave
sr=44100; D=90; t=np.arange(D*sr)/sr
def sm(a,b,x): u=np.clip((x-a)/(b-a),0,1); return u*u*(3-2*u)
f=lambda n:440*2**((n-69)/12)
rng=np.random.default_rng(3)
out=np.zeros_like(t)
def note(s0,n,dur,amp,decay=2.5,bright=0.3):
    i0=int(s0*sr); i1=min(len(t),int((s0+dur)*sr)); tt=t[i0:i1]-s0
    env=np.minimum(tt/0.01,1)*np.exp(-tt*decay)
    fr=f(n); out[i0:i1]+=amp*env*(np.sin(2*np.pi*fr*tt)+bright*np.sin(2*np.pi*2*fr*tt)*np.exp(-tt*4)+0.1*np.sin(2*np.pi*3*fr*tt)*np.exp(-tt*6))
# emotional progression: vi-IV-I-V in G (Em C G D), 4s per chord
prog=[[52,59,64,67],[48,55,60,64],[43,55,59,62],[50,57,62,66]]
beat=0.5
for k in range(int(D/4)+1):
    ch=prog[k%4]; s0=k*4.0
    if s0>=D: break
    # sustained pad
    i0=int(s0*sr); i1=min(len(t),int((s0+5)*sr)); tt=t[i0:i1]-s0
    env=np.minimum(tt/1.0,1)*np.exp(-np.maximum(tt-4,0)*3)
    lvl=0.025+0.03*sm(44,50,s0)+0.02*sm(74,80,s0)
    for n in ch: out[i0:i1]+=lvl*env*(np.sin(2*np.pi*f(n)*tt)+0.3*np.sin(2*np.pi*f(n)*1.004*tt))
    # bass
    note(s0,ch[0]-12,4,0.12,0.6,0.1)
    # piano arpeggio
    arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[3]+12,ch[2]+12,ch[1]+12,ch[2]+12,ch[3]+12]
    for j,n in enumerate(arp):
        note(s0+j*beat,n,2.5,0.07,2.2)
    # melody from chapter 3 on, gentle
    if s0>=22:
        mel={0:[76,74,71],1:[72,71,67],2:[71,74,79],3:[78,76,74]}[k%4]
        for j,n in enumerate(mel): note(s0+j*1.33,n,2.5,0.06+0.03*sm(48,56,s0),1.6,0.5)
# applause at graduation (30-33) & opening (53-57)
noise=rng.standard_normal(len(t))
claps=np.zeros_like(t)
for (a,b) in [(30,33.5),(53.2,57.5)]:
    for c0 in np.arange(a,b,0.02):
        if rng.random()<0.55:
            i0=int((c0+rng.random()*0.02)*sr); n=int(0.03*sr); claps[i0:i0+n]+=rng.standard_normal(n)*np.exp(-np.arange(n)/sr*120)*0.5
claps=np.convolve(claps,[1,-0.6],'same')
out+=claps*0.10*((1-sm(32.5,34,t))*sm(29.8,30.2,t)+sm(53,53.4,t)*(1-sm(56,58,t)))
# crackling fire in prologue, morning birds ch1
fire=np.convolve(noise,np.ones(30)/30,'same')*(rng.random(len(t))<0.002)*40
out+=np.convolve(fire,np.ones(80)/80,'same')*0.6*(1-sm(9,10.2,t))
for b0 in np.arange(11,21,1.3):
    i0=int(b0*sr); n=int(0.18*sr); tt=np.arange(n)/sr
    out[i0:i0+n]+=0.02*np.sin(2*np.pi*(3200+1800*np.sin(tt*60))*tt)*np.exp(-tt*14)
# construction taps 35-46
for c0 in np.arange(35,46,0.5):
    i0=int(c0*sr); n=int(0.08*sr); tt=np.arange(n)/sr
    out[i0:i0+n]+=0.05*np.sin(2*np.pi*900*tt)*np.exp(-tt*60)
# fireworks booms + crackle 78.5-89
for k in range(12):
    s0=78.5+k*0.85+0.3+rng.random()*0.3
    i0=int(s0*sr); n=int(1.2*sr); tt=np.arange(n)/sr
    if i0+n>len(t): continue
    out[i0:i0+n]+=0.25*np.sin(2*np.pi*55*tt*np.exp(-tt*2))*np.exp(-tt*5)
    cr=rng.standard_normal(n)*(rng.random(n)<0.01)*np.exp(-tt*2.5); out[i0:i0+n]+=np.convolve(cr,np.ones(20)/20,'same')*0.5
out*=sm(0,1.5,t)*(1-sm(87.5,90,t))
out=np.tanh(out/np.max(np.abs(out))*1.2)*0.85
st=np.stack([out,np.roll(out,180)],1)
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
