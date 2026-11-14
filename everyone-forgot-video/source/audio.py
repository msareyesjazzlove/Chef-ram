import numpy as np, wave
sr=44100; D=90; t=np.arange(D*sr)/sr
def sm(a,b,x): u=np.clip((x-a)/(b-a),0,1); return u*u*(3-2*u)
f=lambda n:440*2**((n-69)/12)
rng=np.random.default_rng(7)
out=np.zeros_like(t)
def note(s0,n,dur,amp,decay=2.0,bright=0.3):
    i0=int(s0*sr); i1=min(len(t),int((s0+dur)*sr))
    if i0>=len(t): return
    tt=t[i0:i1]-s0; env=np.minimum(tt/0.01,1)*np.exp(-tt*decay); fr=f(n)
    out[i0:i1]+=amp*env*(np.sin(2*np.pi*fr*tt)+bright*np.sin(2*np.pi*2*fr*tt)*np.exp(-tt*4))
# Act 1 (0-46): warm then sparse, minor, lonely; Act 2 (46-58): single notes, hope; Act 3 (58-90): major, full
minor=[[45,57,60,64],[41,53,57,60],[48,55,60,64],[43,55,59,62]]   # Am F C G
major=[[48,55,60,64],[43,55,59,62],[45,57,60,64],[41,53,57,65]]   # C G Am F
for k in range(23):
    s0=k*4.0
    ch = major[k%4] if (s0<8 or s0>=58) else minor[k%4]
    lvl = 0.03 if s0<8 else (0.018 if s0<46 else (0.01 if s0<58 else 0.03+0.025*sm(70,78,s0)))
    i0=int(s0*sr); i1=min(len(t),int((s0+5)*sr)); tt=t[i0:i1]-s0
    env=np.minimum(tt/1.2,1)*np.exp(-np.maximum(tt-4,0)*3)
    for n in ch: out[i0:i1]+=lvl*env*(np.sin(2*np.pi*f(n)*tt)+0.3*np.sin(2*np.pi*f(n)*1.004*tt))
    if s0<46 or s0>=58: note(s0,ch[0]-12,4,0.1 if s0>=58 else 0.07,0.6,0.1)
    # piano arpeggio, thinner in the lonely middle
    step = 0.5 if (s0<8 or s0>=58) else 1.0
    arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[3]+12,ch[2]+12,ch[1]+12,ch[2]+12,ch[3]+12]
    for j in range(int(4/step)):
        if 34<=s0<46 and j%2: continue
        note(s0+j*step,arp[j%8],2.5,0.065,2.0)
    if s0>=62:
        mel=[[76,74,72],[74,71,67],[72,76,79],[77,76,72]][k%4]
        for j,n in enumerate(mel): note(s0+j*1.33,n,2.6,0.06+0.03*sm(72,78,s0),1.5,0.5)
# heartbeat + single hopeful bell notes on the bench (46-58)
for b0 in np.arange(47,58,1.0):
    for d,a in [(0,1),(0.22,0.7)]:
        i0=int((b0+d)*sr); n=int(0.25*sr); tt=np.arange(n)/sr
        out[i0:i0+n]+=0.18*a*np.sin(2*np.pi*55*tt)*np.exp(-tt*18)*sm(48,52,b0)
for b0,n in [(49,76),(51,79),(53,83),(55,84),(56.5,88)]: note(b0,n,3,0.07,1.0,0.4)
# shimmer when threads snap (7.5-10) and glow (59-80)
noise=rng.standard_normal(len(t))
for s0 in list(np.arange(7.6,9.8,0.32))+list(np.arange(60.1,71.5,1.25))+list(np.arange(74,79,0.18)):
    note(s0,96+int(rng.integers(-5,5)),0.8,0.025,4,0.0)
# rain 35-46 and city murmur
rainn=np.convolve(noise,np.ones(6)/6,'same')
out+=rainn*0.05*sm(35,37,t)*(1-sm(45.3,46,t))
murmur=np.convolve(noise,np.ones(600)/600,'same')*12
out+=murmur*0.05*(sm(22,23,t)*(1-sm(33.5,34,t))+sm(34,35,t)*(1-sm(45.5,46,t))+sm(58,59,t)*(1-sm(71.5,72,t)))
out*=sm(0,1.5,t)*(1-sm(87.5,90,t))
out=np.tanh(out/np.max(np.abs(out))*1.2)*0.85
st=np.stack([out,np.roll(out,180)],1)
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype('<i2').tobytes()); w.close()
