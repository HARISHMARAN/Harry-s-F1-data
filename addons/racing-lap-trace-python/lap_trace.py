import os
import plotly.graph_objects as go
import json
from plotly.subplots import make_subplots

def load_data(filename):
    file_path = os.path.join('data', filename)
    with open(file_path, 'r') as file:
        return file.read()
    
def create_chart(distance, steering, gears, throttle, braking, speed):

    fig = make_subplots(
        rows=5, cols=1, shared_xaxes=True, vertical_spacing=0.02,
        row_heights=[1, 3, 1, 1, 1]
    )

    fig.add_trace(go.Scatter(x=distance, y=steering, mode='lines', name='Steering'), row=1, col=1)
    fig.add_trace(go.Scatter(x=distance, y=speed, mode='lines', name='Speed (mph)'), row=2, col=1)
    fig.add_trace(go.Scatter(x=distance, y=gears, mode='lines', name='Gears'), row=3, col=1)
    fig.add_trace(go.Scatter(x=distance, y=throttle, mode='lines', name='Throttle (%)'), row=4, col=1)
    fig.add_trace(go.Scatter(x=distance, y=braking, mode='lines', name='Braking (%)'), row=5, col=1)

    fig.update_layout(
        height=1000,
        title_text="Lap Trace Data",
        paper_bgcolor='black',
        plot_bgcolor='#171717',
        font=dict(color='white'),
        xaxis=dict(showgrid=False),
        yaxis=dict(showgrid=False) 
    )

    fig.update_xaxes(showgrid=False)
    fig.update_yaxes(showgrid=False)
    fig.update_yaxes(zeroline=False, zerolinewidth=2)
    fig.update_xaxes(title_text='Distance (m)', row=5, col=1)

    fig.show()

def __main__():

    data = load_data('lap.json')

    data = json.loads(data)

    lap_distance = []
    steering = []
    gears = []
    throttle = []
    braking = []
    speed = []

    for entry in data:
        lap_distance.append(entry['lap_distance'])
        steering.append(entry['steering'])
        gears.append(entry['gear'])
        throttle.append(entry['throttle'] * 100)
        braking.append(entry['brake'] * 100)
        speed.append(entry['speed'])


    create_chart(lap_distance, steering, gears, throttle, braking, speed)


if __name__ == '__main__':
    __main__()