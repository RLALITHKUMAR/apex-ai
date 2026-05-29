import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Cpu, Image, Sparkles, HelpCircle, Layers } from 'lucide-react';

export function LabView() {
  const [selectedTopic, setSelectedTopic] = useState<'cnn' | 'gradcam' | 'cv_preprocess' | 'viva_qna'>('cnn');

  const topics = {
    cnn: {
      title: 'Lightweight Convolutional Neural Network Topology',
      icon: Cpu,
      detail: (
        <div className="space-y-6">
          <p className="text-on-surface-variant leading-relaxed text-sm">
            Our model leverages a custom, lightweight CNN architecture rather than heavy pre-trained models. This ensures high-speed, local CPU inference that can run smoothly on micro-computers or localized edge nodes.
          </p>
          <div className="silk-card p-xl bg-surface-container-low/20 rounded-xl border border-outline-variant/30">
            <h4 className="text-primary font-display font-medium mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4" /> Feature Extraction Pipeline Schema
            </h4>
            <div className="font-mono text-xs space-y-3 text-on-surface-variant">
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>📦 Raw Input Dimensions</span>
                <span className="text-on-surface">[224 × 224 × 3 RGB]</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>➔ Block 01</span>
                <span className="text-on-surface">Conv2D (32, 3x3) + BatchNorm + ReLU + MaxPool (2x2) + Dropout (0.25)</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>➔ Block 02</span>
                <span className="text-on-surface">Conv2D (64, 3x3) + BatchNorm + ReLU + MaxPool (2x2) + Dropout (0.25)</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>➔ Block 03</span>
                <span className="text-on-surface">Conv2D (128, 3x3) + BatchNorm + ReLU + MaxPool (2x2) + Dropout (0.3)</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>➔ Block 04</span>
                <span className="text-on-surface">Conv2D (256, 3x3) + BatchNorm + ReLU (Final maps)</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span>➔ Dense Section</span>
                <span className="text-on-surface">GlobalAveragePooling2D ➔ Dense (512, ReLU) ➔ Dropout (0.5)</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>📤 Final Classifier Layer</span>
                <span className="text-primary font-bold">Dense (4, Softmax)</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    gradcam: {
      title: 'Class Activation Mapping (Grad-CAM)',
      icon: Image,
      detail: (
        <div className="space-y-6">
          <p className="text-on-surface-variant leading-relaxed text-sm">
            <strong>Grad-CAM</strong> leverages the gradients of any target class score flowing into the final convolutional layer of the CNN. By computing these gradients, the system generates a heatmap showing the exact regions of interest the model focused on during prediction.
          </p>
          <div className="p-xl rounded-xl border border-secondary/20 bg-secondary-container/5 border-l-4 border-l-secondary">
            <h4 className="text-secondary font-display font-medium mb-3 text-xs uppercase tracking-widest">
              Explainability vs. Black Box
            </h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Normal deep learning networks are often referred to as "black boxes" because they offer no transparency regarding how they classify inputs. Grad-CAM provides visual accountability, proving that the model is detecting actual cracks rather than shadows or background concrete noise.
            </p>
          </div>
        </div>
      )
    },
    cv_preprocess: {
      title: 'Adaptive Histogram Equalization (CLAHE)',
      icon: Sparkles,
      detail: (
        <div className="space-y-6">
          <p className="text-on-surface-variant leading-relaxed text-sm">
            To ensure the neural network receives high-contrast crack boundaries regardless of lighting conditions, the raw frames undergo a specialized OpenCV enhancement sequence.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="silk-card p-xl rounded-xl border border-outline-variant/20 bg-surface-container-low/10">
              <h4 className="text-tertiary font-display font-medium text-sm mb-2">CLAHE Contrast Equalizer</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Converts BGR to LAB color space, equalizes the Lightness (L) channel adaptively within localized 8x8 tiles, preventing background over-saturation.
              </p>
            </div>
            <div className="silk-card p-xl rounded-xl border border-outline-variant/20 bg-surface-container-low/10">
              <h4 className="text-secondary font-display font-medium text-sm mb-2">Bilateral Denoising</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Smooths background concrete textures to eliminate camera sensor noise while maintaining sharp, high-contrast structural edges.
              </p>
            </div>
          </div>
        </div>
      )
    },
    viva_qna: {
      title: 'Examiner Q&A Prep Sheet',
      icon: HelpCircle,
      detail: (
        <div className="space-y-4">
          <QnaBlock
            q="Q1: What loss function is used for optimization?"
            a="Categorical Crossentropy. This calculates loss by comparing predicted class probabilities (outputs from the Softmax layer) with one-hot encoded targets."
          />
          <QnaBlock
            q="Q2: How is crack area percentage calculated?"
            a="Grayscale threshold maps isolate crack pixels from background textures. We then execute cv2.findContours to locate and compute pixel areas, dividing that value by the total image dimensions."
          />
          <QnaBlock
            q="Q3: Why choose Global Average Pooling over Flattening?"
            a="Global Average Pooling reduces model parameter counts drastically (saving weights and memory), reducing overfitting risks while generating the spatial relationships required for Grad-CAM."
          />
        </div>
      )
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  return (
    <motion.div
      className="p-margin-desktop max-w-[1400px] mx-auto w-full flex-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left: Syllabus Menu */}
        <motion.section variants={itemVariants} className="col-span-12 lg:col-span-4">
          <div className="silk-card p-xl rounded-xl space-y-4">
            <h3 className="font-mono text-[10px] font-bold text-outline uppercase tracking-widest mb-4 px-2">
              Explainer Syllabus
            </h3>
            <div className="flex flex-col gap-2">
              {(Object.keys(topics) as Array<keyof typeof topics>).map((key) => {
                const topic = topics[key];
                const Icon = topic.icon;
                const isSelected = selectedTopic === key;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTopic(key)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-primary-container/20 text-primary border-l-2 border-primary'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-outline-variant'}`} />
                    <span className="text-sm">{topic.title.split(' (')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Right: Explainer Content */}
        <motion.section variants={itemVariants} className="col-span-12 lg:col-span-8">
          <div className="silk-card p-xl rounded-xl min-h-[480px] flex flex-col">
            <div className="border-b border-outline-variant/20 pb-4 mb-6">
              <h2 className="font-display text-2xl font-medium tracking-tight text-on-surface">
                {topics[selectedTopic].title}
              </h2>
            </div>
            <div className="flex-1 flex flex-col justify-start">
              {topics[selectedTopic].detail}
            </div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

function QnaBlock({ q, a }: { q: string; a: string }) {
  return (
    <div className="p-xl rounded-xl border border-outline-variant/30 bg-surface-container-lowest/30 border-l-2 border-l-primary">
      <h4 className="font-display font-medium text-sm text-on-surface mb-2">{q}</h4>
      <p className="text-xs text-on-surface-variant leading-relaxed font-mono">{a}</p>
    </div>
  );
}
