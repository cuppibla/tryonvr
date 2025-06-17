'use server';

/**
 * @fileOverview Flow for improving the fit of the 3D model to the user's body.
 *
 * - improveModelFit - A function that handles the model fit improvement process.
 * - ImproveModelFitInput - The input type for the improveModelFit function.
 * - ImproveModelFitOutput - The return type for the improveModelFit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveModelFitInputSchema = z.object({
  poseLandmarks: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
      visibility: z.number().optional(),
    })
  ).describe('The MediaPipe pose landmarks.'),
  modelParameters: z.object({
    scale: z.number().describe('The current scale of the 3D model.'),
    rotationY: z.number().describe('The current rotation of the 3D model around the Y axis.'),
    positionX: z.number().describe('The current X position of the 3D model.'),
    positionY: z.number().describe('The current Y position of the 3D model.'),
    positionZ: z.number().describe('The current Z position of the 3D model.'),
  }).describe('The current parameters of the 3D model.'),
  feedback: z.string().optional().describe('Optional user feedback on the fit (e.g., looser, tighter).'),
  videoWidth: z.number().describe('Width of the video feed'),
  videoHeight: z.number().describe('Height of the video feed'),
}).describe('Input parameters for improving model fit.');

export type ImproveModelFitInput = z.infer<typeof ImproveModelFitInputSchema>;

const ImproveModelFitOutputSchema = z.object({
  updatedModelParameters: z.object({
    scale: z.number().describe('The updated scale of the 3D model.'),
    rotationY: z.number().describe('The updated rotation of the 3D model around the Y axis.'),
    positionX: z.number().describe('The updated X position of the 3D model.'),
    positionY: z.number().describe('The updated Y position of the 3D model.'),
    positionZ: z.number().describe('The updated Z position of the 3D model.'),
  }).describe('The updated parameters of the 3D model.'),
  reasoning: z.string().describe('The reasoning behind the adjustment of the model parameters.'),
}).describe('Output containing updated model parameters and reasoning.');

export type ImproveModelFitOutput = z.infer<typeof ImproveModelFitOutputSchema>;

export async function improveModelFit(input: ImproveModelFitInput): Promise<ImproveModelFitOutput> {
  return improveModelFitFlow(input);
}

const improveModelFitPrompt = ai.definePrompt({
  name: 'improveModelFitPrompt',
  input: {schema: ImproveModelFitInputSchema},
  output: {schema: ImproveModelFitOutputSchema},
  prompt: `You are an expert in adjusting 3D clothing models to fit a person's body based on pose landmarks and user feedback.

You are given the current pose landmarks detected by MediaPipe, the current parameters of the 3D model (scale, rotationY, positionX, positionY, positionZ), and optional user feedback on the fit.

Based on this information, you should determine how to adjust the model parameters to improve the fit. Provide clear reasoning for your adjustments. Remember that the video feed has dimensions width: {{{videoWidth}}} and height: {{{videoHeight}}}.

Pose Landmarks:
{{#each poseLandmarks}}
  {{@key}}: x={{this.x}}, y={{this.y}}, z={{this.z}}, visibility={{this.visibility}}
{{/each}}

Current Model Parameters:
scale={{modelParameters.scale}}, rotationY={{modelParameters.rotationY}}, positionX={{modelParameters.positionX}}, positionY={{modelParameters.positionY}}, positionZ={{modelParameters.positionZ}}

User Feedback (if any):
{{#if feedback}}
  {{{feedback}}}
{{else}}
  No feedback provided.
{{/if}}

Consider how the landmarks relate to typical clothing fit. For example:
* Shoulders (landmarks 11, 12) can inform the shoulder width of a shirt.
* Hips (landmarks 23, 24) can inform the waist position of pants.
* The overall scale of the pose can inform the overall scale of the clothing.

Output the updated model parameters and your reasoning.
`,
});

const improveModelFitFlow = ai.defineFlow(
  {
    name: 'improveModelFitFlow',
    inputSchema: ImproveModelFitInputSchema,
    outputSchema: ImproveModelFitOutputSchema,
  },
  async input => {
    const {output} = await improveModelFitPrompt(input);
    return output!;
  }
);
