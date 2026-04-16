import imageio.v3 as iio

infile = r"C:\CLG\Github Projects\CREDIT_CARD_Fraud\fraudshield_demo.webp"
outfile = r"C:\CLG\Github Projects\CREDIT_CARD_Fraud\fraudshield_demo.mp4"

print("Reading WebP...")
frames = iio.imread(infile, plugin="pillow")
print(f"Loaded {len(frames)} frames. Writing to MP4...")

iio.imwrite(outfile, frames, plugin="FFMPEG", fps=10)
print("Done!")
